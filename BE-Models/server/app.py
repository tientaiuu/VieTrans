"""
VieTrans API Server
──────────────────
Serve live image translation results
as a REST API for the FE frontend.

Usage:
    cd BE-Models/server
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
import io
import base64
import binascii
import hashlib
import shutil
import time
import json
import secrets
from collections import defaultdict, deque
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends, Request, Header
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.security.utils import get_authorization_scheme_param
from datetime import datetime, timedelta, timezone
from PIL import Image, UnidentifiedImageError
import asyncio
import uuid

# Import auth module
from auth import (
    API_KEY_PREFIX,
    router as auth_router,
    init_mongo,
    close_mongo,
    decode_token,
    get_db,
    get_user_by_api_key,
)
from space_client import RemoteInferenceError, run_space_inference

# ─── Path resolution ──────────────────────────────────────────────────────────
SERVER_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SERVER_DIR.parent
RESULTS_DIR = BACKEND_ROOT / "outputs" / "results"
LIVE_DIR = RESULTS_DIR / "live"
HISTORY_ASSETS_DIR = RESULTS_DIR / "history"
LIVE_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

LIVE_STAGES = {"input", "back", "text_en", "text_vi", "fuse"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
MAX_EDITED_IMAGE_BYTES = int(os.getenv("MAX_EDITED_IMAGE_BYTES", str(10 * 1024 * 1024)))
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", str(16 * 1024 * 1024)))
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "25000000"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "30"))
LIVE_RESULT_TTL_SECONDS = int(os.getenv("LIVE_RESULT_TTL_SECONDS", str(24 * 60 * 60)))
MAX_CONCURRENT_SPACE_CALLS = max(1, int(os.getenv("MAX_CONCURRENT_SPACE_CALLS", "3")))
UPLOAD_JOB_WORKERS = max(1, int(os.getenv("UPLOAD_JOB_WORKERS", str(MAX_CONCURRENT_SPACE_CALLS))))
RATE_LIMITED_PREFIXES = (
    "/api/upload",
    "/api/update-fuse",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/api-key",
)

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
_rate_limit_hits: dict[str, deque[float]] = defaultdict(deque)
_last_cleanup_at = 0.0
_upload_job_queue: asyncio.Queue[str] | None = None
_upload_job_workers: list[asyncio.Task] = []
_queued_upload_job_ids: set[str] = set()
_space_call_semaphore: asyncio.Semaphore | None = None


def _live_result_count() -> int:
    try:
        return sum(1 for item in LIVE_DIR.iterdir() if item.is_dir())
    except Exception:
        return 0


def _is_child_path(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except (OSError, ValueError):
        return False


def _safe_rmtree(path: Path, root: Path) -> bool:
    if not path.exists():
        return False
    if not path.is_dir() or not _is_child_path(path, root):
        raise RuntimeError(f"Refusing to remove unsafe path: {path}")
    shutil.rmtree(path)
    return True


def _cleanup_old_live_results(force: bool = False) -> int:
    if LIVE_RESULT_TTL_SECONDS <= 0:
        return 0

    global _last_cleanup_at
    now = time.time()
    if not force and now - _last_cleanup_at < 3600:
        return 0
    _last_cleanup_at = now

    removed = 0
    cutoff = now - LIVE_RESULT_TTL_SECONDS
    for item in LIVE_DIR.iterdir():
        try:
            if not item.is_dir() or item.stat().st_mtime >= cutoff:
                continue
            if _safe_rmtree(item, LIVE_DIR):
                removed += 1
        except Exception as exc:
            print(f"[Warn] Could not remove old live result {item.name}: {type(exc).__name__}")
    return removed


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def _read_json_file(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _write_json_file(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _sample_dirs(sample_id: str) -> list[Path]:
    return [path for path in (LIVE_DIR / sample_id, HISTORY_ASSETS_DIR / sample_id) if path.exists()]


def _find_sample_dir(sample_id: str) -> Path | None:
    for path in _sample_dirs(sample_id):
        return path
    return None


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _metadata_path(sample_dir: Path) -> Path:
    return sample_dir / "metadata.json"


def _write_sample_metadata_hash(sample_dir: Path, sample_id: str, owner_email: str | None, edit_token_hash: str) -> None:
    _write_json_file(
        _metadata_path(sample_dir),
        {
            "sample_id": sample_id,
            "owner_email": owner_email,
            "edit_token_hash": edit_token_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    )


def _write_sample_metadata(sample_dir: Path, sample_id: str, owner_email: str | None, edit_token: str) -> None:
    _write_sample_metadata_hash(sample_dir, sample_id, owner_email, _hash_token(edit_token))


def _read_sample_metadata(sample_id: str) -> dict:
    for sample_dir in _sample_dirs(sample_id):
        metadata = _read_json_file(_metadata_path(sample_dir))
        if metadata:
            return metadata
    return {}


def _edit_token_matches(edit_token: str | None, metadata: dict) -> bool:
    expected_hash = str(metadata.get("edit_token_hash") or "")
    supplied = (edit_token or "").strip()
    return bool(expected_hash and supplied and secrets.compare_digest(_hash_token(supplied), expected_hash))


def _persist_history_assets(sample_id: str, source_dir: Path) -> Path:
    dest_dir = HISTORY_ASSETS_DIR / sample_id
    if dest_dir.exists():
        _safe_rmtree(dest_dir, HISTORY_ASSETS_DIR)
    shutil.copytree(source_dir, dest_dir)
    return dest_dir


async def _sample_owned_by_user(sample_id: str, user: dict | None, metadata: dict | None = None) -> bool:
    if not user:
        return False
    email = user.get("email")
    if not email:
        return False

    metadata = metadata or {}
    if metadata.get("owner_email") == email:
        return True

    try:
        db = get_db()
        return await db.histories.find_one({"sample_id": sample_id, "user_email": email}) is not None
    except HTTPException:
        return False


async def _assert_can_edit_sample(sample_id: str, request: Request, edit_token: str | None) -> dict | None:
    user = await get_optional_user(request)
    metadata = _read_sample_metadata(sample_id)
    if await _sample_owned_by_user(sample_id, user, metadata):
        return user
    if _edit_token_matches(edit_token, metadata):
        return user
    raise HTTPException(403, "You do not have permission to edit this image")


def _latency_from_debug(debug_payload: dict) -> dict:
    timings = debug_payload.get("timings") or debug_payload.get("latency") or {}
    if not isinstance(timings, dict):
        return {}
    return {
        "translation": timings.get("translation_seconds") or timings.get("translation"),
        "inpainting": timings.get("inpainting_seconds") or timings.get("inpainting"),
        "rendering": timings.get("rendering_seconds") or timings.get("rendering"),
        "qa": timings.get("qa_seconds") or timings.get("qa"),
        "translation_to_final_image": (
            timings.get("translation_to_final_image_seconds")
            or timings.get("translation_to_final_image")
            or timings.get("post_translation_to_result_seconds")
        ),
    }


def _number_or_none(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    return None


def _seconds(timings: dict, *keys: str):
    for key in keys:
        value = _number_or_none(timings.get(key))
        if value is not None:
            return value
    return None


def _compact_translation_records(records, limit: int = 12) -> list[dict]:
    if not isinstance(records, list):
        return []

    compact = []
    for record in records[:limit]:
        if not isinstance(record, dict):
            continue
        region = record.get("region") if isinstance(record.get("region"), dict) else {}
        compact.append({
            "index": record.get("index"),
            "source_text": record.get("source_text") or "",
            "translated_text": record.get("translated_text") or "",
            "keep_original": bool(record.get("keep_original", False)),
            "confidence": region.get("confidence"),
            "box": region.get("box"),
        })
    return compact


def _build_pipeline_summary(sample_id: str, stages: dict, debug_payload: dict) -> dict:
    counts = debug_payload.get("counts") if isinstance(debug_payload.get("counts"), dict) else {}
    timings = debug_payload.get("timings") if isinstance(debug_payload.get("timings"), dict) else {}
    qa = debug_payload.get("qa") if isinstance(debug_payload.get("qa"), dict) else {}
    translation_records = (
        debug_payload.get("render_records")
        if isinstance(debug_payload.get("render_records"), list)
        else debug_payload.get("translation_records", [])
    )

    ocr_count = counts.get("ocr_regions", 0) or 0
    translatable_count = counts.get("translatable_regions", 0) or 0
    qa_has_issues = bool(qa.get("has_leftover_english"))
    qa_skipped = bool(qa.get("skipped"))

    steps = [
        {
            "key": "input",
            "label": "Input",
            "detail": "Uploaded image normalized for inference",
            "image": stages.get("input"),
            "duration_seconds": None,
            "status": "complete",
            "metrics": {},
        },
        {
            "key": "ocr",
            "label": "OCR detection",
            "detail": f"Detected {ocr_count} text regions; selected {translatable_count} for translation",
            "image": stages.get("text_en"),
            "duration_seconds": _seconds(timings, "ocr_seconds", "ocr"),
            "status": "complete",
            "metrics": {
                "ocr_regions": ocr_count,
                "translatable_regions": translatable_count,
            },
        },
        {
            "key": "translate",
            "label": "Translation",
            "detail": f"Translated {translatable_count} EN blocks to Vietnamese",
            "image": stages.get("text_vi"),
            "duration_seconds": _seconds(timings, "translation_seconds", "translation"),
            "status": "complete",
            "metrics": {
                "records": len(translation_records) if isinstance(translation_records, list) else 0,
            },
        },
        {
            "key": "inpaint",
            "label": "Inpainting",
            "detail": "Removed changed source text and restored the background",
            "image": stages.get("back"),
            "duration_seconds": _seconds(timings, "inpainting_seconds", "inpainting"),
            "status": "complete",
            "metrics": {},
        },
        {
            "key": "render",
            "label": "Rendering",
            "detail": "Rendered Vietnamese text with fitted layout and style",
            "image": stages.get("text_vi"),
            "duration_seconds": _seconds(timings, "rendering_seconds", "rendering"),
            "status": "complete",
            "metrics": {},
        },
        {
            "key": "qa",
            "label": "QA check",
            "detail": (
                f"{qa.get('issue_count', 0)} leftover-English issue(s)"
                if qa_has_issues
                else "QA skipped by configuration"
                if qa_skipped
                else "No leftover-English issue detected"
            ),
            "image": stages.get("fuse"),
            "duration_seconds": _seconds(timings, "qa_seconds", "qa"),
            "status": "warning" if qa_has_issues else "skipped" if qa_skipped else "complete",
            "metrics": {
                "issue_count": qa.get("issue_count", 0),
                "severity": qa.get("severity", "none"),
            },
        },
        {
            "key": "fuse",
            "label": "Final image",
            "detail": "Background and translated text composited",
            "image": stages.get("fuse"),
            "duration_seconds": _seconds(timings, "total_seconds", "total"),
            "status": "complete",
            "metrics": {},
        },
    ]

    return {
        "sample_id": sample_id,
        "counts": counts,
        "timings": timings,
        "qa": qa,
        "steps": steps,
        "translation_records": _compact_translation_records(translation_records),
        "translation_record_count": len(translation_records) if isinstance(translation_records, list) else 0,
    }


def _stage_urls(sample_id: str) -> dict:
    base = "/api/images"
    return {
        "input": f"{base}/input/{sample_id}",
        "back": f"{base}/back/{sample_id}",
        "text_en": f"{base}/text_en/{sample_id}",
        "text_vi": f"{base}/text_vi/{sample_id}",
        "fuse": f"{base}/fuse/{sample_id}",
    }


def _build_upload_result(sample_id: str, tit: str, ocr: str, debug_payload: dict) -> dict:
    stages = _stage_urls(sample_id)
    return {
        "matched_id": sample_id,
        "match_quality": "remote_inference",
        "tit": tit,
        "ocr": ocr,
        "stages": stages,
        "latency": _latency_from_debug(debug_payload),
        "pipeline": _build_pipeline_summary(sample_id, stages, debug_payload),
    }


def _allowed_origins() -> list[str]:
    raw = os.environ.get(
        "ALLOWED_ORIGINS",
        "https://vietrans-projects.netlify.app,https://vietrans.app,"
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
    )
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",", 1)[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host
    return f"{client_ip or 'unknown'}:{request.url.path}"


def _is_rate_limited(request: Request) -> bool:
    if not any(request.url.path.startswith(prefix) for prefix in RATE_LIMITED_PREFIXES):
        return False

    now = time.monotonic()
    hits = _rate_limit_hits[_client_key(request)]
    while hits and now - hits[0] > RATE_LIMIT_WINDOW_SECONDS:
        hits.popleft()

    if len(hits) >= RATE_LIMIT_MAX_REQUESTS:
        return True

    hits.append(now)
    return False


def _normalize_live_sample_id(sample_id: str, status_code: int = 404) -> str:
    try:
        return str(uuid.UUID(str(sample_id)))
    except (TypeError, ValueError):
        raise HTTPException(status_code, "Live sample not found")


def _detect_image_mime(contents: bytes) -> str | None:
    if contents.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "image/webp"
    return None


def _open_rgb_image(contents: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(contents))
        if img.width * img.height > MAX_IMAGE_PIXELS:
            raise HTTPException(400, "Image dimensions are too large")
        img.load()
        return img.convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        print(f"[Warn] Rejected invalid image: {type(exc).__name__}")
        raise HTTPException(400, "Cannot process image")


def _validate_upload(file: UploadFile, contents: bytes) -> None:
    if not contents:
        raise HTTPException(400, "File is empty")
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_IMAGE_BYTES // (1024 * 1024)}MB)")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(400, "Unsupported image extension. Use JPG, PNG, or WebP.")

    declared_mime = (file.content_type or "").split(";", 1)[0].strip().lower()
    if declared_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(400, "Unsupported image type. Use JPG, PNG, or WebP.")

    actual_mime = _detect_image_mime(contents)
    if actual_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(400, "Unsupported or invalid image file")
    if actual_mime != declared_mime:
        raise HTTPException(400, "Image content does not match its declared type")


def _decode_data_uri_image(image_data: str) -> bytes:
    if not image_data.startswith("data:image/") or "," not in image_data:
        raise HTTPException(400, "Invalid image data")

    header, encoded = image_data.split(",", 1)
    declared_mime = header[5:].split(";", 1)[0].strip().lower()
    if declared_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(400, "Unsupported image type. Use JPG, PNG, or WebP.")

    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Invalid image data")

    if len(data) > MAX_EDITED_IMAGE_BYTES:
        raise HTTPException(413, f"File too large (max {MAX_EDITED_IMAGE_BYTES // (1024 * 1024)}MB)")

    actual_mime = _detect_image_mime(data)
    if actual_mime != declared_mime:
        raise HTTPException(400, "Image content does not match its declared type")
    return data


def _ensure_upload_queue() -> asyncio.Queue[str]:
    global _upload_job_queue
    if _upload_job_queue is None:
        _upload_job_queue = asyncio.Queue()
    return _upload_job_queue


def _normalize_job_id(job_id: str, status_code: int = 404) -> str:
    try:
        return str(uuid.UUID(str(job_id)))
    except (TypeError, ValueError):
        raise HTTPException(status_code, "Upload job not found")


def _dt_iso(value) -> str | None:
    return value.isoformat() if hasattr(value, "isoformat") else None


def _format_upload_job(doc: dict) -> dict:
    payload = {
        "job_id": doc.get("job_id") or str(doc.get("_id")),
        "sample_id": doc.get("sample_id"),
        "matched_id": doc.get("sample_id"),
        "status": doc.get("status", "queued"),
        "created_at": _dt_iso(doc.get("created_at")),
        "updated_at": _dt_iso(doc.get("updated_at")),
        "started_at": _dt_iso(doc.get("started_at")),
        "completed_at": _dt_iso(doc.get("completed_at")),
    }
    if doc.get("result"):
        payload["result"] = doc["result"]
    if doc.get("error"):
        payload["error"] = doc["error"]
    return payload


async def _enqueue_upload_job(job_id: str) -> None:
    queue = _ensure_upload_queue()
    if job_id in _queued_upload_job_ids:
        return
    _queued_upload_job_ids.add(job_id)
    await queue.put(job_id)


async def _ensure_upload_job_indexes() -> None:
    db = get_db()
    await db.upload_jobs.create_index([("status", 1), ("created_at", 1)])
    await db.upload_jobs.create_index("sample_id")
    await db.upload_jobs.create_index("owner_email")


async def _recover_pending_upload_jobs() -> int:
    db = get_db()
    now = datetime.now(timezone.utc)
    await db.upload_jobs.update_many(
        {"status": "running"},
        {"$set": {"status": "queued", "updated_at": now}, "$unset": {"started_at": ""}},
    )

    recovered = 0
    cursor = db.upload_jobs.find({"status": "queued"}).sort("created_at", 1)
    async for doc in cursor:
        await _enqueue_upload_job(doc["job_id"])
        recovered += 1
    return recovered


async def _finish_upload_job(job_id: str, payload: dict) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    await db.upload_jobs.update_one(
        {"_id": job_id},
        {"$set": {**payload, "updated_at": now, "completed_at": now}},
    )


async def _process_upload_job(job_id: str) -> None:
    db = get_db()
    now = datetime.now(timezone.utc)
    claim = await db.upload_jobs.update_one(
        {"_id": job_id, "status": "queued"},
        {"$set": {"status": "running", "started_at": now, "updated_at": now}},
    )
    if claim.modified_count == 0:
        return

    doc = await db.upload_jobs.find_one({"_id": job_id})
    if not doc:
        return

    sample_id = doc["sample_id"]
    out_dir = LIVE_DIR / sample_id
    input_path = out_dir / "input.jpg"
    owner_email = doc.get("owner_email")
    if not owner_email:
        await _finish_upload_job(
            job_id,
            {"status": "failed", "error": "Authentication is required to process uploads"},
        )
        return

    try:
        if not input_path.exists():
            raise RuntimeError("Queued upload input image is missing")

        semaphore = _space_call_semaphore or asyncio.Semaphore(1)
        async with semaphore:
            tit = await asyncio.to_thread(run_space_inference, str(input_path), str(out_dir))

        ocr = _read_text_file(out_dir / "ocr.txt")
        debug_payload = _read_json_file(out_dir / "debug" / "09_pipeline_debug.json")
        upload_result = _build_upload_result(sample_id, tit, ocr, debug_payload)
        _write_sample_metadata_hash(out_dir, sample_id, owner_email, doc["edit_token_hash"])

        if owner_email:
            _persist_history_assets(sample_id, out_dir)
            await db.histories.insert_one({
                "user_email": owner_email,
                "sample_id": sample_id,
                "tit": tit,
                "ocr": ocr,
                "stages": upload_result["stages"],
                "latency": upload_result["latency"],
                "pipeline": upload_result["pipeline"],
                "created_at": datetime.now(timezone.utc),
            })

        _cleanup_old_live_results()
        await _finish_upload_job(job_id, {"status": "succeeded", "result": upload_result})
    except RemoteInferenceError as exc:
        print(f"[Error] Remote Space inference failed for job {job_id}: {type(exc).__name__}: {exc}")
        await _finish_upload_job(
            job_id,
            {
                "status": "failed",
                "error": (
                    "Ket noi toi inference Space that bai. "
                    "Space co the dang khoi dong hoac dang ban; vui long thu lai sau vai phut."
                ),
            },
        )
    except Exception as exc:
        print(f"[Error] Upload job {job_id} failed: {type(exc).__name__}: {exc}")
        await _finish_upload_job(job_id, {"status": "failed", "error": "Backend proxy failed"})


async def _upload_job_worker(worker_id: int) -> None:
    queue = _ensure_upload_queue()
    while True:
        job_id: str | None = None
        try:
            job_id = await queue.get()
            _queued_upload_job_ids.discard(job_id)
            await _process_upload_job(job_id)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"[Error] Upload worker {worker_id} crashed on {job_id}: {type(exc).__name__}: {exc}")
        finally:
            if job_id is not None:
                queue.task_done()


def _start_upload_workers() -> None:
    global _space_call_semaphore
    _ensure_upload_queue()
    _space_call_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SPACE_CALLS)
    if _upload_job_workers:
        return
    for idx in range(UPLOAD_JOB_WORKERS):
        _upload_job_workers.append(asyncio.create_task(_upload_job_worker(idx + 1)))
    print(
        f"[VieTrans] Upload workers: {UPLOAD_JOB_WORKERS}; "
        f"space concurrency: {MAX_CONCURRENT_SPACE_CALLS}"
    )


async def _stop_upload_workers() -> None:
    if not _upload_job_workers:
        return
    for task in _upload_job_workers:
        task.cancel()
    await asyncio.gather(*_upload_job_workers, return_exceptions=True)
    _upload_job_workers.clear()


app = FastAPI(
    title="VieTrans Image Translation API",
    description="Serve live in-image translation results",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Edit-Token"],
    expose_headers=["Content-Disposition", "X-Pipeline-Stage"],
    max_age=600,
)

app.include_router(auth_router)


@app.middleware("http")
async def security_controls(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BYTES:
                return JSONResponse(
                    {"detail": f"Request too large (max {MAX_REQUEST_BYTES // (1024 * 1024)}MB)"},
                    status_code=413,
                )
        except ValueError:
            return JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)

    if _is_rate_limited(request):
        return JSONResponse({"detail": "Too many requests. Please try again later."}, status_code=429)

    try:
        response = await call_next(request)
    except Exception as exc:
        print(f"[Error] Unhandled request error: {type(exc).__name__}: {exc}")
        return JSONResponse({"detail": "Internal server error"}, status_code=500)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


@app.on_event("startup")
async def startup():
    await init_mongo()
    await _ensure_upload_job_indexes()
    _start_upload_workers()
    recovered_jobs = await _recover_pending_upload_jobs()
    if recovered_jobs:
        print(f"[VieTrans] Recovered queued upload jobs: {recovered_jobs}")
    removed = _cleanup_old_live_results(force=True)
    if removed:
        print(f"[VieTrans] Removed old live results: {removed}")
    print(f"[VieTrans] Live results: {_live_result_count()}")


@app.on_event("shutdown")
async def shutdown():
    await _stop_upload_workers()
    await close_mongo()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    queue_size = _upload_job_queue.qsize() if _upload_job_queue else 0
    return {
        "status": "ok",
        "total_samples": _live_result_count(),
        "queued_jobs": queue_size,
        "upload_workers": len(_upload_job_workers),
        "space_concurrency": MAX_CONCURRENT_SPACE_CALLS,
    }


@app.get("/api/pipeline-info")
async def pipeline_info():
    """Return the active live translation pipeline metadata."""
    return {
        "total_samples": _live_result_count(),
        "stages": [
            {"key": "ocr", "name": "Nhan dang chu", "name_en": "OCR"},
            {"key": "layout", "name": "Phan tich bo cuc", "name_en": "Layout Analysis"},
            {"key": "translate", "name": "Dich theo cum ngu nghia", "name_en": "Context Translation"},
            {"key": "render", "name": "Ve lai van ban", "name_en": "Style-Aware Rendering"},
        ],
        "models": {
            "ocr": {"engine": "remote Hugging Face Space"},
            "layout": {"engine": "remote Hugging Face Space"},
            "translation": {"engine": "remote NLLB-200 fine-tuned EN-VI"},
            "render": {"engine": "remote inpaint + render planner"},
        },
        "image_size": {"width": "source", "height": "source"},
    }


@app.get("/api/samples/{sample_id}")
async def get_sample(sample_id: str):
    """Return one live upload result."""
    sample_id = _normalize_live_sample_id(sample_id)

    result_dir = _find_sample_dir(sample_id)
    if result_dir is None:
        raise HTTPException(404, f"Live sample {sample_id} not found")

    base = "/api/images"
    stages = {
        "input": f"{base}/input/{sample_id}",
        "back": f"{base}/back/{sample_id}",
        "text_en": f"{base}/text_en/{sample_id}",
        "text_vi": f"{base}/text_vi/{sample_id}",
        "fuse": f"{base}/fuse/{sample_id}",
    }
    debug_payload = _read_json_file(result_dir / "debug" / "09_pipeline_debug.json")
    return {
        "id": sample_id,
        "tit": _read_text_file(result_dir / "tit.txt"),
        "ocr": _read_text_file(result_dir / "ocr.txt"),
        "stages": stages,
        "pipeline": _build_pipeline_summary(sample_id, stages, debug_payload),
    }


@app.get("/api/images/{stage}/{sample_id}")
async def get_image(stage: str, sample_id: str, download: bool = False):
    """Serve a live pipeline-stage image with no-cache headers."""
    if stage not in LIVE_STAGES:
        raise HTTPException(400, f"Unknown stage: {stage}")

    sample_id = _normalize_live_sample_id(sample_id)
    sample_dir = _find_sample_dir(sample_id)
    img_path = sample_dir / f"{stage}.jpg" if sample_dir else None
    if img_path is None or not img_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Pipeline-Stage": stage,
    }
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{stage}_{sample_id}.jpg"'

    return FileResponse(img_path, media_type="image/jpeg", headers=headers)


@app.get("/api/download/{stage}/{sample_id}")
async def download_image(
    stage: str,
    sample_id: str,
    filename: str = Query("translated_image", description="Download filename (without extension)"),
    format: str = Query("jpg", description="Image format: jpg, png, or webp"),
):
    """Download a live pipeline-stage image with custom filename and format conversion."""
    if stage not in LIVE_STAGES:
        raise HTTPException(400, f"Unknown stage: {stage}")

    sample_id = _normalize_live_sample_id(sample_id)
    fmt = format.lower().strip()
    if fmt not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(400, f"Unsupported format: {format}. Use jpg, png, or webp.")
    if fmt == "jpeg":
        fmt = "jpg"

    sample_dir = _find_sample_dir(sample_id)
    img_path = sample_dir / f"{stage}.jpg" if sample_dir else None
    if img_path is None or not img_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

    fmt_map = {
        "jpg": ("JPEG", "image/jpeg", "jpg"),
        "png": ("PNG", "image/png", "png"),
        "webp": ("WEBP", "image/webp", "webp"),
    }
    pil_fmt, mime_type, ext = fmt_map[fmt]
    safe_name = "".join(c for c in filename if c.isalnum() or c in (" ", "-", "_", ".")).strip()[:80]
    if not safe_name:
        safe_name = "translated_image"

    try:
        img = Image.open(img_path).convert("RGB")
        buf = io.BytesIO()
        save_kwargs = {}
        if pil_fmt == "JPEG":
            save_kwargs["quality"] = 95
        elif pil_fmt == "WEBP":
            save_kwargs["quality"] = 90
        img.save(buf, pil_fmt, **save_kwargs)
    except Exception as exc:
        print(f"[Error] Image conversion failed: {type(exc).__name__}: {exc}")
        raise HTTPException(500, "Image conversion failed")

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}.{ext}"',
    }
    return Response(content=buf.getvalue(), media_type=mime_type, headers=headers)


async def get_optional_user(request: Request):
    api_key = (request.headers.get("X-API-Key") or "").strip()
    if api_key:
        user = await get_user_by_api_key(api_key)
        if user is None:
            raise HTTPException(401, "Invalid API key")
        return user

    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer":
        return None
    token = token.strip()
    if token.startswith(API_KEY_PREFIX):
        user = await get_user_by_api_key(token)
        if user is None:
            raise HTTPException(401, "Invalid API key")
        return user

    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if not email: return None
        email = str(email).strip().lower()
        db = get_db()
        user = await db.users.find_one({"email": email})
        return user
    except Exception:
        return None


async def get_authenticated_request_user(request: Request):
    user = await get_optional_user(request)
    if user is None:
        raise HTTPException(401, "Not authenticated")
    return user


@app.get("/api/jobs/{job_id}")
async def get_upload_job(job_id: str, request: Request):
    """Return upload job status and, when ready, the completed upload result."""
    user = await get_authenticated_request_user(request)
    job_id = _normalize_job_id(job_id)
    db = get_db()
    doc = await db.upload_jobs.find_one({"_id": job_id})
    if not doc:
        raise HTTPException(404, "Upload job not found")
    owner_email = doc.get("owner_email")
    if not owner_email:
        raise HTTPException(403, "Upload job is not tied to an authenticated owner")
    if owner_email != user.get("email"):
        raise HTTPException(404, "Upload job not found")
    return _format_upload_job(doc)


@app.post("/api/upload", status_code=202)
async def upload_and_match(request: Request, file: UploadFile = File(...)):
    """
    Accept an uploaded image, save it securely, and enqueue a background
    inference job. Clients can poll /api/jobs/{job_id} for the result.
    """
    user = await get_authenticated_request_user(request)

    contents = await file.read()
    _validate_upload(file, contents)

    job_id = str(uuid.uuid4())
    sample_id = str(uuid.uuid4())
    edit_token = secrets.token_urlsafe(32)
    out_dir = LIVE_DIR / sample_id
    out_dir.mkdir(parents=True, exist_ok=True)

    input_path = out_dir / "input.jpg"

    try:
        # Pre-process uploaded bytes and save as safe JPG
        img = _open_rgb_image(contents)
        img.save(input_path, "JPEG", quality=95)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Warn] Rejected image during preprocessing: {type(exc).__name__}: {exc}")
        raise HTTPException(400, "Cannot process image")

    owner_email = user["email"]
    now = datetime.now(timezone.utc)
    db = get_db()
    await db.upload_jobs.insert_one({
        "_id": job_id,
        "job_id": job_id,
        "sample_id": sample_id,
        "status": "queued",
        "owner_email": owner_email,
        "edit_token_hash": _hash_token(edit_token),
        "filename": Path(file.filename or "upload.jpg").name[:160],
        "created_at": now,
        "updated_at": now,
    })
    await _enqueue_upload_job(job_id)

    return {
        "job_id": job_id,
        "sample_id": sample_id,
        "matched_id": sample_id,
        "status": "queued",
        "poll_url": f"/api/jobs/{job_id}",
        "edit_token": edit_token,
    }


# Manual fuse update

class UpdateFuseRequest(BaseModel):
    image_data: str = Field(..., max_length=15 * 1024 * 1024)

@app.post("/api/update-fuse/{sample_id}")
async def update_fuse(
    sample_id: str,
    req: UpdateFuseRequest,
    request: Request,
    x_edit_token: str | None = Header(None, alias="X-Edit-Token"),
):
    sample_id = _normalize_live_sample_id(sample_id, status_code=400)

    sample_dirs = _sample_dirs(sample_id)
    if not sample_dirs:
        raise HTTPException(404, "Sample not found")

    await _assert_can_edit_sample(sample_id, request, x_edit_token)

    try:
        data = _decode_data_uri_image(req.image_data)
        img = _open_rgb_image(data)
        for sample_dir in sample_dirs:
            img.save(sample_dir / "fuse.jpg", "JPEG", quality=95)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Warn] Rejected edited image: {type(exc).__name__}: {exc}")
        raise HTTPException(400, "Invalid image data")
    
    return {"status": "ok"}


@app.get("/api/history")
async def get_history(
    date: Optional[str] = Query(None, description="Filter by local date in YYYY-MM-DD format"),
    tz_offset_minutes: int = Query(0, description="Client timezone offset in minutes from Date.getTimezoneOffset()"),
    user=Depends(get_authenticated_request_user),
):
    db = get_db()
    query = {"user_email": user["email"]}

    if date:
        try:
            local_day = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

        utc_start = (local_day + timedelta(minutes=tz_offset_minutes)).replace(tzinfo=timezone.utc)
        utc_end = utc_start + timedelta(days=1)
        query["created_at"] = {"$gte": utc_start, "$lt": utc_end}

    cursor = db.histories.find(query).sort("created_at", -1)
    histories = []
    async for doc in cursor:
        histories.append({
            "id": doc["sample_id"],
            "tit": doc.get("tit", ""),
            "ocr": doc.get("ocr", ""),
            "stages": doc.get("stages", {}),
            "pipeline": doc.get("pipeline", {}),
            "created_at": doc["created_at"].isoformat()
        })
    return {"histories": histories}


@app.delete("/api/history/{sample_id}")
async def delete_history(sample_id: str, user=Depends(get_authenticated_request_user)):
    sample_id = _normalize_live_sample_id(sample_id, status_code=400)
    db = get_db()
    result = await db.histories.delete_one({"user_email": user["email"], "sample_id": sample_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "History not found")
    for root in (HISTORY_ASSETS_DIR, LIVE_DIR):
        try:
            _safe_rmtree(root / sample_id, root)
        except Exception as exc:
            print(f"[Warn] Could not remove assets for {sample_id}: {type(exc).__name__}")
    return {"status": "ok"}
