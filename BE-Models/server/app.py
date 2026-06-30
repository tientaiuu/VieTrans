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
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.security.utils import get_authorization_scheme_param
from datetime import datetime, timedelta, timezone
from PIL import Image
import asyncio
import uuid

# Import auth module
from auth import router as auth_router, init_mongo, close_mongo, decode_token, get_db, get_current_user
from space_client import RemoteInferenceError, run_space_inference

# Keep backend requests ordered; the deployed Space owns model/GPU concurrency.
space_call_lock = asyncio.Lock()

# ─── Path resolution ──────────────────────────────────────────────────────────
SERVER_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SERVER_DIR.parent
RESULTS_DIR = BACKEND_ROOT / "outputs" / "results"
LIVE_DIR = RESULTS_DIR / "live"
LIVE_DIR.mkdir(parents=True, exist_ok=True)

LIVE_STAGES = {"input", "back", "text_en", "text_vi", "fuse"}


def _live_result_count() -> int:
    try:
        return sum(1 for item in LIVE_DIR.iterdir() if item.is_dir())
    except Exception:
        return 0


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


app = FastAPI(
    title="VieTrans Image Translation API",
    description="Serve live in-image translation results",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
async def startup():
    await init_mongo()
    print(f"[VieTrans] Live results: {_live_result_count()}")


@app.on_event("shutdown")
async def shutdown():
    await close_mongo()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "total_samples": _live_result_count()}


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
    if "-" not in sample_id and len(sample_id) <= 10:
        raise HTTPException(404, "Precomputed samples have been removed")

    result_dir = LIVE_DIR / sample_id
    if not result_dir.exists():
        raise HTTPException(404, f"Live sample {sample_id} not found")

    base = "/api/images"
    return {
        "id": sample_id,
        "tit": _read_text_file(result_dir / "tit.txt"),
        "ocr": _read_text_file(result_dir / "ocr.txt"),
        "stages": {
            "input": f"{base}/input/{sample_id}",
            "back": f"{base}/back/{sample_id}",
            "text_en": f"{base}/text_en/{sample_id}",
            "text_vi": f"{base}/text_vi/{sample_id}",
            "fuse": f"{base}/fuse/{sample_id}",
        },
    }


@app.get("/api/images/{stage}/{sample_id}")
async def get_image(stage: str, sample_id: str, download: bool = False):
    """Serve a live pipeline-stage image with no-cache headers."""
    if stage not in LIVE_STAGES:
        raise HTTPException(400, f"Unknown stage: {stage}")

    img_path = LIVE_DIR / sample_id / f"{stage}.jpg"
    if not img_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Pipeline-Stage": stage,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
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

    fmt = format.lower().strip()
    if fmt not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(400, f"Unsupported format: {format}. Use jpg, png, or webp.")
    if fmt == "jpeg":
        fmt = "jpg"

    img_path = LIVE_DIR / sample_id / f"{stage}.jpg"
    if not img_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

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
        img = Image.open(img_path).convert("RGB")
        buf = io.BytesIO()
        save_kwargs = {}
        if pil_fmt == "JPEG":
            save_kwargs["quality"] = 95
        elif pil_fmt == "WEBP":
            save_kwargs["quality"] = 90
        img.save(buf, pil_fmt, **save_kwargs)
    except Exception as e:
        raise HTTPException(500, f"Image conversion failed: {e}")

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}.{ext}"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
    }
    return Response(content=buf.getvalue(), media_type=mime_type, headers=headers)


async def get_optional_user(request: Request):
    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer":
        return None
    try:
        payload = decode_token(token)
        email = payload.get("sub")
        if not email: return None
        db = get_db()
        user = await db.users.find_one({"email": email})
        return user
    except Exception:
        return None


@app.post("/api/upload")
async def upload_and_match(request: Request, file: UploadFile = File(...)):
    """
    Accept an uploaded image, save it securely, and proxy it to the
    deployed inference Space. The backend only stores API-facing results.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    uid = str(uuid.uuid4())
    out_dir = LIVE_DIR / uid
    out_dir.mkdir(parents=True, exist_ok=True)

    input_path = out_dir / "input.jpg"

    try:
        # Pre-process uploaded bytes and save as safe JPG
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img.save(input_path, "JPEG", quality=95)
    except Exception as e:
        raise HTTPException(400, f"Cannot process image: {e}")

    async with space_call_lock:
        try:
            tit = await asyncio.to_thread(
                run_space_inference, str(input_path), str(out_dir)
            )
        except RemoteInferenceError as e:
            import traceback
            print("[Error] Remote Space inference failed:")
            traceback.print_exc()
            raise HTTPException(
                502,
                "Ket noi toi inference Space that bai. "
                "Space co the dang khoi dong hoac dang ban; vui long thu lai sau vai phut.",
            )
        except Exception as e:
            import traceback
            print("[Error] Unexpected backend proxy error:")
            traceback.print_exc()
            raise HTTPException(500, f"Backend proxy failed: {e}")
    ocr = _read_text_file(out_dir / "ocr.txt")
    base = "/api/images"
    stages = {
        "input":   f"{base}/input/{uid}",
        "back":    f"{base}/back/{uid}",
        "text_en": f"{base}/text_en/{uid}",
        "text_vi": f"{base}/text_vi/{uid}",
        "fuse":    f"{base}/fuse/{uid}",
    }

    user = await get_optional_user(request)
    if user:
        db = get_db()
        await db.histories.insert_one({
            "user_email": user["email"],
            "sample_id": uid,
            "tit": tit,
            "ocr": ocr,
            "stages": stages,
            "created_at": datetime.now(timezone.utc)
        })

    return {
        "matched_id": uid,
        "match_quality": "remote_inference",
        "tit": tit,
        "ocr": ocr,
        "stages": stages,
    }


# Manual fuse update

class UpdateFuseRequest(BaseModel):
    image_data: str

@app.post("/api/update-fuse/{sample_id}")
async def update_fuse(sample_id: str, req: UpdateFuseRequest):
    if "-" not in sample_id and len(sample_id) <= 10:
        raise HTTPException(400, "Can only update live samples")
    
    fuse_path = LIVE_DIR / sample_id / "fuse.jpg"
    if not fuse_path.exists():
        raise HTTPException(404, "Sample not found")

    import base64
    try:
        header, encoded = req.image_data.split(",", 1)
        data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img.save(fuse_path, "JPEG", quality=95)
    except Exception as e:
        raise HTTPException(400, f"Invalid image data: {e}")
    
    return {"status": "ok"}


@app.get("/api/history")
async def get_history(
    date: Optional[str] = Query(None, description="Filter by local date in YYYY-MM-DD format"),
    tz_offset_minutes: int = Query(0, description="Client timezone offset in minutes from Date.getTimezoneOffset()"),
    user=Depends(get_current_user),
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
            "created_at": doc["created_at"].isoformat()
        })
    return {"histories": histories}


@app.delete("/api/history/{sample_id}")
async def delete_history(sample_id: str, user=Depends(get_current_user)):
    db = get_db()
    result = await db.histories.delete_one({"user_email": user["email"], "sample_id": sample_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "History not found")
    return {"status": "ok"}
