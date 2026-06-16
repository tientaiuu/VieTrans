"""
VieTrans API gateway for the DebackX image-translation worker.

The web backend stays lightweight: it handles auth, history, file proxying, and
frontend-facing response shapes, while the deployed DebackX worker runs OCR,
translation, inpainting, and rendering.
"""
from __future__ import annotations

import base64
import io
import asyncio
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.security.utils import get_authorization_scheme_param
from PIL import Image
from pydantic import BaseModel

try:
    from .auth import router as auth_router
    from .auth import close_mongo, decode_token, get_current_user, get_db, init_mongo
except ImportError:
    from auth import router as auth_router
    from auth import close_mongo, decode_token, get_current_user, get_db, init_mongo


SERVER_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = Path(os.environ.get("VIETRANS_RUNTIME_DIR", SERVER_DIR.parent / "outputs" / "gateway"))
JOBS_DIR = RUNTIME_DIR / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

WORKER_URL = os.environ.get("IIMT_WORKER_URL", "http://localhost:8081").rstrip("/")
WORKER_TIMEOUT = float(os.environ.get("IIMT_WORKER_TIMEOUT_SECONDS", "300"))
WORKER_MODE = os.environ.get("IIMT_WORKER_MODE", "sync").strip().lower()
WORKER_POLL_INTERVAL = float(os.environ.get("IIMT_WORKER_POLL_INTERVAL_SECONDS", "2"))
WORKER_API_KEY = os.environ.get("IIMT_WORKER_API_KEY") or os.environ.get("WORKER_API_KEY")
MAX_UPLOAD_BYTES = int(os.environ.get("VIETRANS_MAX_UPLOAD_MB", "20")) * 1024 * 1024
AUTH_ENABLED = os.environ.get("AUTH_ENABLED", "true").lower() not in {"0", "false", "no"}
auth_ready = False

app = FastAPI(
    title="VieTrans DebackX Gateway",
    description="Frontend-facing API that calls the DebackX EN-VI image translation worker.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


def _worker_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return urljoin(WORKER_URL + "/", path.lstrip("/"))


def _worker_headers(headers: dict[str, str] | None = None) -> dict[str, str]:
    merged = dict(headers or {})
    if WORKER_API_KEY:
        merged.setdefault("Authorization", f"Bearer {WORKER_API_KEY}")
        merged.setdefault("X-API-Key", WORKER_API_KEY)
    return merged


def _job_path(job_id: str) -> Path:
    if not job_id or any(char in job_id for char in "/\\"):
        raise HTTPException(status_code=422, detail="Invalid job id")
    return JOBS_DIR / f"{job_id}.json"


def _read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found") from None
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Cached job is invalid: {exc}") from exc


def _write_job(record: dict[str, Any]) -> None:
    _job_path(record["job_id"]).write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _parse_time(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def _elapsed_ms(worker_job: dict[str, Any], fallback_ms: int | None) -> int | None:
    started_at = _parse_time(worker_job.get("started_at"))
    finished_at = _parse_time(worker_job.get("finished_at"))
    if started_at and finished_at:
        return int((finished_at - started_at).total_seconds() * 1000)
    return fallback_ms


def _join_region_text(regions: list[dict[str, Any]], key: str) -> str:
    lines = [str(region.get(key, "")).strip() for region in regions]
    return "\n".join(line for line in lines if line)


def _average_confidence(regions: list[dict[str, Any]]) -> float | None:
    values = [
        float(region["detector_confidence"])
        for region in regions
        if isinstance(region.get("detector_confidence"), (int, float))
    ]
    if not values:
        return None
    return sum(values) / len(values)


def _stage_paths(job_id: str) -> dict[str, str]:
    return {
        "input": f"/api/images/input/{job_id}",
        "result": f"/api/images/result/{job_id}",
        "mask": f"/api/images/mask/{job_id}",
        "metadata": f"/api/images/metadata/{job_id}",
        # Backward-compatible aliases for the current FE editor/history code.
        "fuse": f"/api/images/result/{job_id}",
        "text_vi": f"/api/images/result/{job_id}",
        "back": f"/api/images/mask/{job_id}",
        "text_en": f"/api/images/input/{job_id}",
    }


def _normalize_worker_job(worker_job: dict[str, Any], fallback_ms: int | None = None) -> dict[str, Any]:
    job_id = str(worker_job.get("job_id") or "")
    if not job_id:
        raise HTTPException(status_code=502, detail="Worker response does not include job_id")

    result = worker_job.get("result") or {}
    regions = result.get("regions") or []
    if not isinstance(regions, list):
        regions = []

    ocr_text = _join_region_text(regions, "ocr_text")
    translated_text = _join_region_text(regions, "translation")
    latency_ms = _elapsed_ms(worker_job, fallback_ms)

    return {
        "id": job_id,
        "job_id": job_id,
        "matched_id": job_id,
        "status": worker_job.get("status", "unknown"),
        "mode": worker_job.get("mode", "sync"),
        "match_quality": "live_inference",
        "created_at": worker_job.get("created_at"),
        "started_at": worker_job.get("started_at"),
        "finished_at": worker_job.get("finished_at"),
        "latency_ms": latency_ms,
        "latency_seconds": round(latency_ms / 1000, 3) if latency_ms is not None else None,
        "num_regions": int(result.get("num_regions") or len(regions)),
        "avg_confidence": _average_confidence(regions),
        "ocr": ocr_text,
        "tit": translated_text,
        "regions": regions,
        "stages": _stage_paths(job_id),
        "worker": {
            "base_url": WORKER_URL,
            "input_url": _worker_url(worker_job.get("input_url")),
            "output_url": _worker_url(result.get("output_url")),
            "mask_url": _worker_url(result.get("mask_url")),
            "metadata_url": _worker_url(result.get("metadata_url")),
            "raw_status_url": _worker_url(f"/jobs/{job_id}"),
        },
        "error": worker_job.get("error"),
    }


def _list_cached_jobs() -> list[dict[str, Any]]:
    jobs = []
    for path in JOBS_DIR.glob("*.json"):
        try:
            jobs.append(_read_json(path))
        except HTTPException:
            continue
    jobs.sort(key=lambda item: item.get("created_at") or item.get("finished_at") or "", reverse=True)
    return jobs


async def _fetch_worker_json(method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    timeout = httpx.Timeout(WORKER_TIMEOUT)
    kwargs["headers"] = _worker_headers(kwargs.get("headers"))
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.request(method, _worker_url(path), **kwargs)
    if response.status_code >= 400:
        detail: Any = response.text
        try:
            detail = response.json().get("detail", detail)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"DebackX worker failed: {detail}")
    return response.json()


async def _fetch_worker_asset(record: dict[str, Any], stage: str) -> tuple[bytes, str]:
    stage_map = {
        "input": "input_url",
        "result": "output_url",
        "fuse": "output_url",
        "text_vi": "output_url",
        "mask": "mask_url",
        "back": "mask_url",
        "metadata": "metadata_url",
        "text_en": "input_url",
    }
    if stage not in stage_map:
        raise HTTPException(status_code=400, detail=f"Unknown stage: {stage}")

    source_url = record.get("worker", {}).get(stage_map[stage])
    if not source_url:
        raise HTTPException(status_code=404, detail=f"Stage is not available: {stage}")

    async with httpx.AsyncClient(timeout=httpx.Timeout(WORKER_TIMEOUT)) as client:
        response = await client.get(source_url, headers=_worker_headers())
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Could not fetch worker asset: {response.status_code}")

    media_type = response.headers.get("content-type") or "application/octet-stream"
    return response.content, media_type


async def _run_worker_translation(files: dict[str, tuple[str, bytes, str]]) -> dict[str, Any]:
    if WORKER_MODE == "async":
        queued_job = await _fetch_worker_json("POST", "/jobs", files=files)
        job_id = str(queued_job.get("job_id") or "")
        if not job_id:
            raise HTTPException(status_code=502, detail="Worker async response does not include job_id")

        deadline = time.monotonic() + WORKER_TIMEOUT
        while time.monotonic() < deadline:
            job = await _fetch_worker_json("GET", f"/jobs/{job_id}")
            status = job.get("status")
            if status in {"succeeded", "failed"}:
                return job
            await asyncio.sleep(WORKER_POLL_INTERVAL)

        raise HTTPException(status_code=504, detail=f"DebackX worker job timed out: {job_id}")

    return await _fetch_worker_json("POST", "/translate", files=files)


async def get_optional_user(request: Request):
    if not auth_ready:
        return None

    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if not email:
            return None
        db = get_db()
        return await db.users.find_one({"email": email})
    except Exception:
        return None


async def _save_history(request: Request, record: dict[str, Any]) -> None:
    user = await get_optional_user(request)
    if not user:
        return
    db = get_db()
    await db.histories.insert_one(
        {
            "user_email": user["email"],
            "job_id": record["job_id"],
            "tit": record.get("tit", ""),
            "ocr": record.get("ocr", ""),
            "stages": record.get("stages", {}),
            "created_at": datetime.now(timezone.utc),
        }
    )


@app.on_event("startup")
async def startup():
    global auth_ready
    if not AUTH_ENABLED:
        return
    try:
        await init_mongo()
        auth_ready = True
    except Exception as exc:
        auth_ready = False
        print(f"[Auth] MongoDB is not ready, auth/history disabled: {exc}")


@app.on_event("shutdown")
async def shutdown():
    if auth_ready:
        await close_mongo()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    try:
        worker = await _fetch_worker_json("GET", "/health")
        worker_status = "ok"
    except Exception as exc:
        worker = {"status": "unreachable", "detail": str(exc)}
        worker_status = "unreachable"

    return {
        "status": "ok" if worker_status == "ok" else "degraded",
        "service": "vietrans-gateway",
        "worker_url": WORKER_URL,
        "worker_mode": WORKER_MODE,
        "worker_status": worker_status,
        "worker": worker,
        "auth_ready": auth_ready,
        "cached_jobs": len(_list_cached_jobs()),
        "total_samples": len(_list_cached_jobs()),
    }


@app.get("/api/pipeline-info")
async def pipeline_info() -> dict[str, Any]:
    cached_jobs = len(_list_cached_jobs())
    return {
        "name": "VieTrans + DebackX",
        "total_samples": cached_jobs,
        "source_language": "English",
        "target_language": "Vietnamese",
        "worker_url": WORKER_URL,
        "stages": [
            {"key": "ocr", "name": "OCR", "name_en": "PaddleOCR PP-OCRv5 detection and recognition"},
            {"key": "translate", "name": "Dich may", "name_en": "Fine-tuned NLLB 1.3B EN-VI translation"},
            {"key": "inpaint", "name": "Xoa chu cu", "name_en": "OpenCV text-mask inpainting"},
            {"key": "render", "name": "Ve chu dich", "name_en": "Adaptive Vietnamese text rendering"},
        ],
        "models": {
            "ocr_detection": {"name": "PP-OCRv5_server_det", "source": "PaddleOCR pretrained"},
            "ocr_recognition": {"name": "en_PP-OCRv5_mobile_rec", "source": "PaddleOCR pretrained"},
            "translation": {
                "name": "facebook/nllb-200-1.3B fine-tuned EN-VI",
                "checkpoint": "configured in DebackX worker",
            },
            "renderer": {"name": "DebackX adaptive renderer", "font": "DejaVu Sans fallback"},
        },
        "measured_metrics": {
            "status": "not_reported_in_gateway",
            "note": "Add BLEU, chrF, OCR CER/WER, latency, RAM/VRAM, throughput, and end-to-end quality after running the official DebackX evaluation.",
        },
    }


@app.post("/api/upload")
async def upload_image(request: Request, file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        max_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large. Max upload is {max_mb}MB")

    filename = file.filename or "upload.png"
    files = {"file": (filename, contents, file.content_type)}
    started = time.perf_counter()
    worker_job = await _run_worker_translation(files)
    fallback_ms = int((time.perf_counter() - started) * 1000)

    if worker_job.get("status") != "succeeded":
        error = worker_job.get("error") or {"message": "Unknown worker failure"}
        raise HTTPException(status_code=502, detail=f"DebackX worker job failed: {error}")

    normalized = _normalize_worker_job(worker_job, fallback_ms=fallback_ms)
    _write_job(normalized)
    await _save_history(request, normalized)
    return normalized


@app.get("/api/jobs")
async def list_jobs(page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=100)) -> dict[str, Any]:
    jobs = _list_cached_jobs()
    total = len(jobs)
    start = (page - 1) * limit
    end = min(start + limit, total)
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "jobs": jobs[start:end],
    }


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict[str, Any]:
    return _read_json(_job_path(job_id))


@app.get("/api/images/{stage}/{job_id}")
async def get_image(stage: str, job_id: str, download: bool = False) -> Response:
    record = _read_json(_job_path(job_id))
    content, media_type = await _fetch_worker_asset(record, stage)

    if stage == "metadata":
        return JSONResponse(json.loads(content.decode("utf-8")))

    headers = {
        "Cache-Control": "private, max-age=300",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
    }
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{stage}_{job_id}.png"'
    return Response(content=content, media_type=media_type, headers=headers)


@app.get("/api/images/thumb/{stage}/{job_id}")
async def get_thumbnail(stage: str, job_id: str):
    record = _read_json(_job_path(job_id))
    content, _media_type = await _fetch_worker_asset(record, stage)
    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
        ratio = 256 / max(1, img.width)
        img = img.resize((256, max(1, int(img.height * ratio))), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=82)
        buf.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {exc}") from exc

    return Response(
        content=buf.getvalue(),
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=300"},
    )


@app.get("/api/download/{stage}/{job_id}")
async def download_image(
    stage: str,
    job_id: str,
    filename: str = Query("translated_image", description="Download filename without extension"),
    format: str = Query("png", description="Image format: jpg, png, or webp"),
):
    fmt = format.lower().strip()
    if fmt not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Unsupported format. Use jpg, png, or webp.")
    if fmt == "jpeg":
        fmt = "jpg"

    record = _read_json(_job_path(job_id))
    content, _media_type = await _fetch_worker_asset(record, stage)

    fmt_map = {
        "jpg": ("JPEG", "image/jpeg", "jpg"),
        "png": ("PNG", "image/png", "png"),
        "webp": ("WEBP", "image/webp", "webp"),
    }
    pil_fmt, mime_type, ext = fmt_map[fmt]

    safe_name = "".join(c for c in filename if c.isalnum() or c in (" ", "-", "_", ".")).strip()
    if not safe_name:
        safe_name = "translated_image"

    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
        buf = io.BytesIO()
        save_kwargs = {"quality": 95} if pil_fmt in {"JPEG", "WEBP"} else {}
        img.save(buf, pil_fmt, **save_kwargs)
        buf.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image conversion failed: {exc}") from exc

    headers = {"Content-Disposition": f'attachment; filename="{safe_name}.{ext}"'}
    return StreamingResponse(buf, media_type=mime_type, headers=headers)


class UpdateFuseRequest(BaseModel):
    image_data: str


@app.post("/api/update-fuse/{job_id}")
async def update_fuse(job_id: str, req: UpdateFuseRequest):
    record = _read_json(_job_path(job_id))
    try:
        _header, encoded = req.image_data.split(",", 1)
        base64.b64decode(encoded)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {exc}") from exc

    # The edited image is kept client-side for the current session. Persisting it
    # back into the DebackX worker is intentionally not supported by the worker API.
    record["edited_locally"] = True
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    _write_job(record)
    return {"status": "ok"}


@app.get("/api/history")
async def get_history(
    date: Optional[str] = Query(None, description="Filter by local date in YYYY-MM-DD format"),
    tz_offset_minutes: int = Query(0, description="Client timezone offset in minutes from Date.getTimezoneOffset()"),
    user=Depends(get_current_user),
):
    db = get_db()
    query: dict[str, Any] = {"user_email": user["email"]}

    if date:
        try:
            local_day = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        utc_start = (local_day + timedelta(minutes=tz_offset_minutes)).replace(tzinfo=timezone.utc)
        utc_end = utc_start + timedelta(days=1)
        query["created_at"] = {"$gte": utc_start, "$lt": utc_end}

    cursor = db.histories.find(query).sort("created_at", -1)
    histories = []
    async for doc in cursor:
        histories.append(
            {
                "id": doc.get("job_id") or doc.get("sample_id"),
                "tit": doc.get("tit", ""),
                "ocr": doc.get("ocr", ""),
                "stages": doc.get("stages", {}),
                "created_at": doc["created_at"].isoformat(),
            }
        )
    return {"histories": histories}


@app.delete("/api/history/{job_id}")
async def delete_history(job_id: str, user=Depends(get_current_user)):
    db = get_db()
    result = await db.histories.delete_one(
        {
            "user_email": user["email"],
            "$or": [{"job_id": job_id}, {"sample_id": job_id}],
        }
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="History not found")
    return {"status": "ok"}
