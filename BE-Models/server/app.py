"""
VieTrans API Server
──────────────────
Serve pre-computed pipeline results (Separate → Translation → Fuse)
as a REST API for the FE frontend.

Usage:
    cd BE-Models/server
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
import io
import hashlib
import random
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
import asyncio
import uuid

# Import our PyTorch inference pipeline
try:
    from inference import pipeline as dbx_pipeline
except ImportError as e:
    print(f"[Warning] Failed to load inference pipeline: {e}")
    dbx_pipeline = None

# Concurrency lock for heavy GPU/MPS operations
inference_lock = asyncio.Lock()

# ─── Path resolution ──────────────────────────────────────────────────────────
import os

SERVER_DIR = Path(__file__).resolve().parent
DEBACK_ROOT = Path(os.environ.get("DEBACK_ROOT", SERVER_DIR.parent))
PROJECT_ROOT = Path(os.environ.get("PROJECT_ROOT", DEBACK_ROOT.parent))

RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", DEBACK_ROOT / "outputs" / "results"))
DATASET_DIR = Path(os.environ.get("DATASET_DIR", PROJECT_ROOT / "IIMT30k_Vi" / "Arial" / "test"))

# Pipeline stage directories
PATHS = {
    "input":       DATASET_DIR / "en" / "image",
    "input_text":  DATASET_DIR / "en" / "text",
    "back":        RESULTS_DIR / "separate" / "test" / "back" / "en",
    "text_en":     RESULTS_DIR / "separate" / "test" / "text" / "en",
    "text_vi":     RESULTS_DIR / "translation" / "test" / "de" / "text",
    "fuse":        RESULTS_DIR / "fuse" / "test" / "en",
}

LIVE_DIR = RESULTS_DIR / "live"
LIVE_DIR.mkdir(parents=True, exist_ok=True)

THUMB_DIR = RESULTS_DIR / ".thumbs"
THUMB_DIR.mkdir(parents=True, exist_ok=True)

# ─── Cache text results at startup ────────────────────────────────────────────
TIT_FILE = RESULTS_DIR / "translation" / "test" / "tit.de"
OCR_FILE = RESULTS_DIR / "translation" / "test" / "ocr.de"

_tit_lines: list[str] = []
_ocr_lines: list[str] = []
_sample_ids: list[int] = []
_input_hashes: dict[str, int] = {}  # perceptual hash → sample id


def _load_text_cache():
    global _tit_lines, _ocr_lines
    if TIT_FILE.exists():
        _tit_lines = TIT_FILE.read_text(encoding="utf-8").splitlines()
    if OCR_FILE.exists():
        _ocr_lines = OCR_FILE.read_text(encoding="utf-8").splitlines()


def _scan_sample_ids():
    """Build sorted list of available sample IDs from fuse results."""
    global _sample_ids
    fuse_dir = PATHS["fuse"]
    if fuse_dir.exists():
        ids = []
        for f in fuse_dir.iterdir():
            if f.suffix == ".jpg":
                try:
                    ids.append(int(f.stem))
                except ValueError:
                    pass
        _sample_ids = sorted(ids)


def _build_input_hashes():
    """Build simple perceptual hashes of input images for matching uploads."""
    global _input_hashes
    input_dir = PATHS["input"]
    if not input_dir.exists():
        return
    for f in sorted(input_dir.iterdir()):
        if f.suffix != ".jpg":
            continue
        try:
            sample_id = int(f.stem)
        except ValueError:
            continue
        try:
            img = Image.open(f).convert("L").resize((8, 8), Image.LANCZOS)
            pixels = list(img.getdata())
            avg = sum(pixels) / len(pixels)
            bits = "".join("1" if p > avg else "0" for p in pixels)
            _input_hashes[bits] = sample_id
        except Exception:
            pass


def _compute_phash(img_bytes: bytes) -> str:
    """Compute a simple perceptual hash from uploaded image bytes."""
    img = Image.open(io.BytesIO(img_bytes)).convert("L").resize((8, 8), Image.LANCZOS)
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    return "".join("1" if p > avg else "0" for p in pixels)


def _hamming_distance(a: str, b: str) -> int:
    return sum(c1 != c2 for c1, c2 in zip(a, b))


# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="DebackX Pipeline API",
    description="Serve pre-computed In-Image Machine Translation results",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    _load_text_cache()
    _scan_sample_ids()
    _build_input_hashes()
    print(f"[DebackX] Loaded {len(_sample_ids)} samples, {len(_tit_lines)} text lines, {len(_input_hashes)} hashes")
    
    if dbx_pipeline:
        # Preload the 4 transformer models into RAM/VRAM
        await asyncio.to_thread(dbx_pipeline.load_models)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "total_samples": len(_sample_ids)}


@app.get("/api/pipeline-info")
async def pipeline_info():
    """Return pipeline metadata and model info."""
    return {
        "total_samples": len(_sample_ids),
        "stages": [
            {"key": "separate", "name": "Tách nền và chữ", "name_en": "Text-Background Separation"},
            {"key": "translate", "name": "Dịch hình ảnh chữ", "name_en": "Image Translation (EN→VI)"},
            {"key": "fuse", "name": "Ghép ảnh kết quả", "name_en": "Text-Background Fusion"},
        ],
        "models": {
            "separate": {"checkpoint": "checkpoint_best0.023.pt", "patch_size": 16},
            "codebook": {"checkpoint": "checkpoint_best0.039.pt", "codebook_size": 8192},
            "translation": {"checkpoint": "checkpoint_best0.846.pt", "bleu_score": 0.846},
            "fuse": {"checkpoint": "checkpoint_best0.006.pt", "patch_size": 16},
        },
        "image_size": {"width": 512, "height": 48},
    }


@app.get("/api/samples")
async def list_samples(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Paginated list of sample IDs."""
    total = len(_sample_ids)
    start = (page - 1) * limit
    end = min(start + limit, total)
    ids = _sample_ids[start:end]

    samples = []
    for sid in ids:
        tit = _tit_lines[sid - 1] if sid <= len(_tit_lines) else ""
        ocr = _ocr_lines[sid - 1] if sid <= len(_ocr_lines) else ""
        samples.append({"id": sid, "tit": tit, "ocr": ocr})

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "samples": samples,
    }


@app.get("/api/samples/{sample_id}")
async def get_sample(sample_id: str):
    """Full detail for a single sample — all pipeline stage URLs."""
    tit = ""
    ocr = ""
    
    # Check if sample_id is a live inference UUID
    if "-" in sample_id or len(sample_id) > 10:
        if not (LIVE_DIR / sample_id).exists():
            raise HTTPException(404, f"Live Sample {sample_id} not found")
        tit_path = LIVE_DIR / sample_id / "tit.txt"
        tit = tit_path.read_text(encoding="utf-8") if tit_path.exists() else ""
    else:
        try:
            sid_int = int(sample_id)
        except ValueError:
            raise HTTPException(422, "Invalid sample ID format")
            
        if sid_int not in _sample_ids:
            raise HTTPException(404, f"Sample {sid_int} not found")

        tit = _tit_lines[sid_int - 1] if sid_int <= len(_tit_lines) else ""
        ocr = _ocr_lines[sid_int - 1] if sid_int <= len(_ocr_lines) else ""

    base = "/api/images"
    return {
        "id": sample_id,
        "tit": tit,
        "ocr": ocr,
        "stages": {
            "input":   f"{base}/input/{sample_id}",
            "back":    f"{base}/back/{sample_id}",
            "text_en": f"{base}/text_en/{sample_id}",
            "text_vi": f"{base}/text_vi/{sample_id}",
            "fuse":    f"{base}/fuse/{sample_id}",
        },
    }


@app.get("/api/images/{stage}/{sample_id}")
async def get_image(stage: str, sample_id: str):
    """Serve a pipeline-stage image with cache headers."""
    if stage not in PATHS:
        raise HTTPException(400, f"Unknown stage: {stage}")

    # Check if sample_id is a UUID (live uploaded image)
    if "-" in sample_id or len(sample_id) > 10:
        img_path = LIVE_DIR / sample_id / f"{stage}.jpg"
    else:
        img_path = PATHS[stage] / f"{sample_id}.jpg"
        
    if not img_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

    return FileResponse(
        img_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400, immutable",
            "X-Pipeline-Stage": stage,
        },
    )


@app.get("/api/images/thumb/{stage}/{sample_id}")
async def get_thumbnail(stage: str, sample_id: str):
    """Serve a 256px-wide thumbnail (generated on demand, cached)."""
    if stage not in PATHS:
        raise HTTPException(400, f"Unknown stage: {stage}")

    # Allow live UUID handling for thumbnails too
    if "-" in sample_id or len(sample_id) > 10:
        src_path = LIVE_DIR / sample_id / f"{stage}.jpg"
    else:
        src_path = PATHS[stage] / f"{sample_id}.jpg"
        
    if not src_path.exists():
        raise HTTPException(404, f"Image not found: {stage}/{sample_id}")

    thumb_path = THUMB_DIR / stage / f"{sample_id}.jpg"
    if not thumb_path.exists():
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            img = Image.open(src_path)
            ratio = 256 / img.width
            new_size = (256, max(1, int(img.height * ratio)))
            img = img.resize(new_size, Image.LANCZOS)
            img.save(thumb_path, "JPEG", quality=80)
        except Exception as e:
            raise HTTPException(500, f"Thumbnail generation failed: {e}")

    return FileResponse(
        thumb_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=604800, immutable"},
    )


@app.post("/api/upload")
async def upload_and_match(file: UploadFile = File(...)):
    """
    Accept an uploaded image, save it securely, and sequence it 
    through the live Pytorch pipeline. Queues execution if busy.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    if not dbx_pipeline:
        raise HTTPException(500, "Inference pipeline is not configured on this server")

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

    # Use a lock to ensure only 1 inference runs on the GPU/MPS simultaneously
    # to avoid Out-Of-Memory errors under multi-user concurrency.
    async with inference_lock:
        try:
            tit = await asyncio.to_thread(
                dbx_pipeline.run_inference, str(input_path), str(out_dir)
            )
        except Exception as e:
            raise HTTPException(500, f"Inference pipeline failed: {e}")

    base = "/api/images"
    return {
        "matched_id": uid,
        "match_quality": "live_inference",
        "hamming_distance": 0,
        "tit": tit,
        "ocr": "",  # OCR skipped for live inputs
        "stages": {
            "input":   f"{base}/input/{uid}",
            "back":    f"{base}/back/{uid}",
            "text_en": f"{base}/text_en/{uid}",
            "text_vi": f"{base}/text_vi/{uid}",
            "fuse":    f"{base}/fuse/{uid}",
        },
    }


@app.get("/api/random")
async def random_sample():
    """Return a random sample for demo purposes."""
    if not _sample_ids:
        raise HTTPException(500, "No samples available")
    sid = random.choice(_sample_ids)
    return await get_sample(str(sid))
