from __future__ import annotations

import os
from base64 import b64decode
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from PIL import Image


DEFAULT_SPACE_ENDPOINT = "https://masterdzzzz-vietrans-modelspace.hf.space"
DEFAULT_API_NAME = "/translate"


class RemoteInferenceError(RuntimeError):
    """Raised when the remote Space cannot produce a valid inference result."""


@lru_cache(maxsize=1)
def _get_client():
    try:
        from gradio_client import Client
    except Exception as exc:  # pragma: no cover - deployment dependency guard
        raise RemoteInferenceError(
            "gradio-client is not installed on the backend server"
        ) from exc

    endpoint = os.getenv("VIETRANS_SPACE_URL", DEFAULT_SPACE_ENDPOINT).strip()
    token = os.getenv("VIETRANS_SPACE_TOKEN") or os.getenv("HF_TOKEN") or None
    kwargs = {"hf_token": token} if token else {}
    return Client(endpoint, **kwargs)


def _file_arg(path: Path) -> Any:
    try:
        from gradio_client import handle_file

        return handle_file(str(path))
    except Exception:
        return str(path)


def _api_name() -> str:
    name = os.getenv("VIETRANS_SPACE_API_NAME", DEFAULT_API_NAME).strip()
    if not name:
        name = DEFAULT_API_NAME
    return name if name.startswith("/") else f"/{name}"


def _extract_path_or_url(value: Any) -> str | None:
    if isinstance(value, (str, os.PathLike)):
        return str(value)
    if isinstance(value, dict):
        for key in ("path", "url", "name"):
            nested = value.get(key)
            if nested:
                return _extract_path_or_url(nested)
        data = value.get("data")
        if isinstance(data, dict):
            return _extract_path_or_url(data)
    for attr in ("path", "url", "name"):
        nested = getattr(value, attr, None)
        if nested:
            return _extract_path_or_url(nested)
    return None


def _open_remote_image(value: Any) -> Image.Image | None:
    if value is None:
        return None
    if isinstance(value, Image.Image):
        return value.convert("RGB")

    source = _extract_path_or_url(value)
    if not source:
        return None

    if source.startswith(("http://", "https://")):
        timeout = float(os.getenv("VIETRANS_SPACE_DOWNLOAD_TIMEOUT", "60"))
        with httpx.Client(timeout=timeout) as client:
            response = client.get(source)
            response.raise_for_status()

            return Image.open(BytesIO(response.content)).convert("RGB")

    if source.startswith("data:image/"):
        _, encoded = source.split(",", 1)
        return Image.open(BytesIO(b64decode(encoded))).convert("RGB")

    path = Path(source)
    if path.exists():
        return Image.open(path).convert("RGB")

    return None


def _save_image(value: Any, path: Path, required: bool = True) -> None:
    image = _open_remote_image(value)
    if image is None:
        if required:
            raise RemoteInferenceError(f"Remote Space did not return {path.name}")
        return
    image.save(path, "JPEG", quality=95)


def _clean_translated_text(value: Any) -> str:
    text = str(value or "").strip()
    if "\n\n" not in text:
        return text

    header, body = text.split("\n\n", 1)
    if body.strip() and len(header.strip()) <= 48:
        return body.strip()
    return text


def run_space_inference(input_path: str | Path, output_dir: str | Path) -> str:
    """Call the deployed Gradio Space and persist outputs for the FastAPI app."""
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = _get_client().predict(_file_arg(input_path), api_name=_api_name())
    except Exception as exc:
        raise RemoteInferenceError(f"Remote Space inference failed: {exc}") from exc

    if not isinstance(result, (list, tuple)) or len(result) < 7:
        raise RemoteInferenceError("Remote Space returned an unexpected response")

    fuse_img, text_en_img, text_vi_img, back_img, original_img, ocr_text, translated = result[:7]

    _save_image(fuse_img, output_dir / "fuse.jpg")
    _save_image(text_en_img, output_dir / "text_en.jpg")
    _save_image(text_vi_img, output_dir / "text_vi.jpg")
    _save_image(back_img, output_dir / "back.jpg")
    _save_image(original_img, output_dir / "input.jpg", required=False)

    ocr = str(ocr_text or "").strip()
    title = _clean_translated_text(translated)
    (output_dir / "ocr.txt").write_text(ocr, encoding="utf-8")
    (output_dir / "tit.txt").write_text(title, encoding="utf-8")
    return title
