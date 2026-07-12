from __future__ import annotations

import os
import json
import time
from base64 import b64decode
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import httpx
from PIL import Image


DEFAULT_SPACE_ENDPOINT = "https://masterdzzzz-vietrans-modelspace.hf.space"
DEFAULT_API_NAME = "/translate"


class RemoteInferenceError(RuntimeError):
    """Raised when the remote Space cannot produce a valid inference result."""


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _space_request_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        timeout=None,
        connect=_env_float("VIETRANS_SPACE_CONNECT_TIMEOUT", 60.0),
        read=_env_float("VIETRANS_SPACE_READ_TIMEOUT", 600.0),
        write=_env_float("VIETRANS_SPACE_WRITE_TIMEOUT", 300.0),
        pool=_env_float("VIETRANS_SPACE_POOL_TIMEOUT", 60.0),
    )


@contextmanager
def _gradio_post_timeout(timeout: httpx.Timeout):
    """Give gradio_client file uploads a longer write timeout."""
    original_post = httpx.post

    def post_with_timeout(*args: Any, **kwargs: Any):
        kwargs.setdefault("timeout", timeout)
        return original_post(*args, **kwargs)

    httpx.post = post_with_timeout
    try:
        yield
    finally:
        httpx.post = original_post


def _is_retryable_remote_error(exc: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, (httpx.TimeoutException, httpx.TransportError)):
            return True
        current = current.__cause__ or current.__context__
    return False


def _get_client():
    try:
        from gradio_client import Client
    except Exception as exc:  # pragma: no cover - deployment dependency guard
        raise RemoteInferenceError(
            "gradio-client is not installed on the backend server"
        ) from exc

    endpoint = os.getenv("VIETRANS_SPACE_URL", DEFAULT_SPACE_ENDPOINT).strip()
    token = os.getenv("VIETRANS_SPACE_TOKEN") or os.getenv("HF_TOKEN") or None
    kwargs = {"token": token} if token else {}
    # Keep image outputs as Space URLs and let this module fetch only the expected
    # image slots. Otherwise gradio_client may recursively download file-like
    # paths inside the debug JSON, such as system font paths, and fail with 403.
    try:
        return Client(endpoint, download_files=False, **kwargs)
    except TypeError:
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


def _space_endpoint() -> str:
    return os.getenv("VIETRANS_SPACE_URL", DEFAULT_SPACE_ENDPOINT).strip().rstrip("/")


def _space_auth_headers() -> dict[str, str]:
    token = os.getenv("VIETRANS_SPACE_TOKEN") or os.getenv("HF_TOKEN") or None
    return {"Authorization": f"Bearer {token}"} if token else {}


def _source_candidates(value: Any) -> list[str]:
    candidates: list[str] = []

    def add(candidate: Any) -> None:
        if isinstance(candidate, (str, os.PathLike)):
            text = str(candidate).strip()
            if text and text not in candidates:
                candidates.append(text)

    def collect(item: Any) -> None:
        if isinstance(item, (str, os.PathLike)):
            add(item)
            return
        if isinstance(item, dict):
            for key in ("url", "path", "name", "data"):
                nested = item.get(key)
                if nested:
                    collect(nested)
            return
        for attr in ("url", "path", "name"):
            nested = getattr(item, attr, None)
            if nested:
                collect(nested)

    collect(value)
    return candidates


def _absolute_remote_source(source: str) -> str:
    if source.startswith(("http://", "https://", "data:image/")):
        return source
    if source.startswith(("/gradio_api/", "gradio_api/", "/file=", "file=")):
        return urljoin(f"{_space_endpoint()}/", source.lstrip("/"))
    return source


def _extract_path_or_url(value: Any) -> str | None:
    if isinstance(value, (str, os.PathLike)):
        return str(value)
    if isinstance(value, dict):
        for key in ("url", "path", "name"):
            nested = value.get(key)
            if nested:
                return _extract_path_or_url(nested)
        data = value.get("data")
        if isinstance(data, dict):
            return _extract_path_or_url(data)
    for attr in ("url", "path", "name"):
        nested = getattr(value, attr, None)
        if nested:
            return _extract_path_or_url(nested)
    return None


def _open_remote_image(value: Any) -> Image.Image | None:
    if value is None:
        return None
    if isinstance(value, Image.Image):
        return value.convert("RGB")

    sources = _source_candidates(value)
    if not sources:
        return None

    timeout = float(os.getenv("VIETRANS_SPACE_DOWNLOAD_TIMEOUT", "60"))
    for raw_source in sources:
        source = _absolute_remote_source(raw_source)

        if source.startswith(("http://", "https://")):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.get(source, headers=_space_auth_headers())
                    response.raise_for_status()
                    return Image.open(BytesIO(response.content)).convert("RGB")
            except Exception:
                continue

        if source.startswith("data:image/"):
            try:
                _, encoded = source.split(",", 1)
                return Image.open(BytesIO(b64decode(encoded))).convert("RGB")
            except Exception:
                continue

        path = Path(source)
        if path.exists():
            try:
                return Image.open(path).convert("RGB")
            except Exception:
                continue

    return None


def _save_image(value: Any, path: Path, required: bool = True) -> None:
    image = _open_remote_image(value)
    if image is None:
        if required:
            candidates = _source_candidates(value)
            hint = f" Candidates: {candidates[:3]}" if candidates else ""
            raise RemoteInferenceError(f"Remote Space did not return a usable image for {path.name}.{hint}")
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

    attempts = max(1, _env_int("VIETRANS_SPACE_RETRIES", 2))
    retry_delay = max(0.0, _env_float("VIETRANS_SPACE_RETRY_DELAY", 2.0))
    timeout = _space_request_timeout()

    try:
        for attempt in range(1, attempts + 1):
            try:
                with _gradio_post_timeout(timeout):
                    result = _get_client().predict(
                        _file_arg(input_path),
                        api_name=_api_name(),
                    )
                break
            except Exception as exc:
                if attempt >= attempts or not _is_retryable_remote_error(exc):
                    raise
                time.sleep(retry_delay * attempt)
    except Exception as exc:
        raise RemoteInferenceError(f"Remote Space inference failed: {exc}") from exc

    if not isinstance(result, (list, tuple)) or len(result) < 7:
        raise RemoteInferenceError("Remote Space returned an unexpected response")

    fuse_img, text_en_img, text_vi_img, back_img, original_img, ocr_text, translated = result[:7]
    debug_payload = result[7] if len(result) >= 8 and isinstance(result[7], dict) else {}
    remote_error = debug_payload.get("error") if isinstance(debug_payload, dict) else None
    if remote_error and not _source_candidates(fuse_img):
        raise RemoteInferenceError(f"Remote Space pipeline error: {remote_error}")

    _save_image(fuse_img, output_dir / "fuse.jpg")
    _save_image(text_en_img, output_dir / "text_en.jpg")
    _save_image(text_vi_img, output_dir / "text_vi.jpg")
    _save_image(back_img, output_dir / "back.jpg")
    _save_image(original_img, output_dir / "input.jpg", required=False)

    ocr = str(ocr_text or "").strip()
    title = _clean_translated_text(translated)
    (output_dir / "ocr.txt").write_text(ocr, encoding="utf-8")
    (output_dir / "tit.txt").write_text(title, encoding="utf-8")
    if debug_payload:
        debug_dir = output_dir / "debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        (debug_dir / "09_pipeline_debug.json").write_text(
            json.dumps(debug_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        qa_payload = debug_payload.get("qa")
        if isinstance(qa_payload, dict):
            (output_dir / "qa.json").write_text(
                json.dumps(qa_payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    return title
