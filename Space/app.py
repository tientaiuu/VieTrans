"""
VieTrans — Gradio App for HuggingFace Space (ZeroGPU)
══════════════════════════════════════════════════════
Pipeline: PaddleOCR PP-OCRv5 (CPU) → NLLB-200 1.3B fine-tuned (GPU) → Adaptive Renderer

Cách dùng decorator @spaces.GPU:
  - Mô hình được load ở cấp module bên NGOÀI decorator (startup toàn cục).
  - Chỉ hàm gọi model.generate() mới cần GPU → bọc run_inference bằng @spaces.GPU.
"""

from __future__ import annotations

import os
import json
import uuid
import shutil
import tempfile
from pathlib import Path

# ─── Thiết lập biến môi trường TRƯỚC KHI import inference ────────────────────
# Đổi thành HuggingFace Hub ID model đã fine-tune của bạn.
# Ví dụ: "tientaiuu/mt-nllb-1p3b-en-vi"  hoặc dùng repo local path.
os.environ.setdefault("NLLB_MODEL_PATH", os.getenv("NLLB_MODEL_PATH", "masterdzzzz/mt-nllb-1p3b-en-vi"))
os.environ.setdefault("NLLB_SRC_LANG",   "eng_Latn")
os.environ.setdefault("NLLB_TGT_LANG",   "vie_Latn")
os.environ.setdefault("OCR_MIN_CONFIDENCE", "0.5")
SPACE_CONCURRENCY = max(1, int(os.getenv("VIETRANS_SPACE_CONCURRENCY", "3")))
SPACE_QUEUE_MAX_SIZE = max(1, int(os.getenv("VIETRANS_SPACE_QUEUE_MAX_SIZE", "32")))

# --- Disable PaddlePaddle PIR & oneDNN to prevent ConvertPirAttribute2RuntimeAttribute crash ---
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_in_executor"] = "0"
os.environ["FLAGS_enable_new_ir"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

try:
    import paddle.inference as pd_inf
    _orig_create_predictor = pd_inf.create_predictor

    def _patched_create_predictor(config, *args, **kwargs):
        if hasattr(config, "enable_new_ir"):
            try:
                config.enable_new_ir(False)
                print("[App Patch] Force-disabled enable_new_ir on Config")
            except Exception as e:
                print(f"[App Patch] Failed to disable new IR: {e}")
        return _orig_create_predictor(config, *args, **kwargs)

    pd_inf.create_predictor = _patched_create_predictor

    _orig_Predictor = pd_inf.Predictor
    class PatchedPredictor(_orig_Predictor):
        def __init__(self, config, *args, **kwargs):
            if hasattr(config, "enable_new_ir"):
                try:
                    config.enable_new_ir(False)
                    print("[App Patch] Force-disabled enable_new_ir in Predictor constructor")
                except Exception as e:
                    print(f"[App Patch] Failed to disable new IR in Predictor: {e}")
            super().__init__(config, *args, **kwargs)

    pd_inf.Predictor = PatchedPredictor
    print("[App Patch] Monkeypatched paddle.inference Predictor and create_predictor successfully")
except Exception as patch_err:
    print(f"[App Patch] Failed to patch paddle.inference: {patch_err}")



# ─── Import Gradio & Spaces ────────────────────────────────────────────────────
import gradio as gr

# Monkeypatch Gradio's ORJSONResponse to support non-string keys (fixes "Error: No API found" / TypeError)
try:
    import gradio.routes as _gr_routes
    import orjson as _orjson
    _orig_render = _gr_routes.ORJSONResponse._render
    def _patched_render(content, *args, **kwargs):
        try:
            return _orig_render(content, *args, **kwargs)
        except TypeError:
            default_fn = getattr(_gr_routes, "default", None)
            return _orjson.dumps(
                content,
                option=_orjson.OPT_SERIALIZE_NUMPY | _orjson.OPT_PASSTHROUGH_DATETIME | _orjson.OPT_NON_STR_KEYS,
                default=default_fn,
            )
    _gr_routes.ORJSONResponse._render = staticmethod(_patched_render)
    print("[App] Patching Gradio ORJSONResponse: SUCCESS")
except Exception as patch_err:
    print(f"[App] Patching Gradio ORJSONResponse: FAILED ({patch_err})")


try:
    import spaces
    ZEROGPU_AVAILABLE = True
    print("[App] ZeroGPU/spaces library found. GPU decorator is active.")
except ImportError:
    # Fallback khi chạy local không có spaces
    class _SpacesFallback:
        @staticmethod
        def GPU(func):
            return func
    spaces = _SpacesFallback()
    ZEROGPU_AVAILABLE = False
    print("[App] spaces library not found. Running without ZeroGPU decorator (local mode).")

# ─── Import pipeline (mô hình được load ở cấp module) ────────────────────────
from inference import pipeline as dbx_pipeline

# Khởi tạo model ngay khi Space start (ZeroGPU emulate CUDA khi cần)
print("[App] Tải model tại startup…")
dbx_pipeline.load_models()
print("[App] Model sẵn sàng.")

# ─── Thư mục lưu kết quả tạm ─────────────────────────────────────────────────
TEMP_ROOT = Path(tempfile.gettempdir()) / "vietrans_space"
TEMP_ROOT.mkdir(parents=True, exist_ok=True)


def _read_text_file(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def _read_json_file(path: str) -> dict:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _format_qa_suffix(report: dict) -> str:
    if not report or not report.get("has_leftover_english"):
        return ""
    count = int(report.get("issue_count") or 0)
    severity = report.get("severity", "medium")
    return f"\n\n⚠️ QA: còn nghi vấn tiếng Anh sau dịch ({count} issue, severity={severity})."


# ═══════════════════════════════════════════════════════════════════════════════
# Hàm suy luận — bọc bởi @spaces.GPU để ZeroGPU cấp phát GPU cho NLLB
# ═══════════════════════════════════════════════════════════════════════════════

@spaces.GPU
def translate_image(input_image):
    """
    Nhận PIL.Image đầu vào → chạy pipeline → trả về:
      (fuse_img, text_en_img, text_vi_img, back_img, original_img, ocr_text, translated_text, debug_payload)
    """
    from PIL import Image as PILImage

    if input_image is None:
        return None, None, None, None, None, "", "Please upload an image first.", {}

    # Tạo thư mục output riêng cho mỗi request
    uid     = str(uuid.uuid4())
    out_dir = str(TEMP_ROOT / uid)
    os.makedirs(out_dir, exist_ok=True)

    # Lưu ảnh đầu vào
    input_path = os.path.join(out_dir, "input.jpg")
    if isinstance(input_image, PILImage.Image):
        input_image.convert("RGB").save(input_path, "JPEG", quality=95)
    else:
        # Gradio có thể truyền numpy array
        import numpy as np
        PILImage.fromarray(input_image).convert("RGB").save(input_path, "JPEG", quality=95)

    try:
        # Chạy pipeline (NLLB sẽ dùng GPU trong vòng đời của @spaces.GPU)
        translated_text = dbx_pipeline.run_inference(input_path, out_dir)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None, None, None, None, None, "", f"Pipeline error: {e}", {"error": str(e)}

    # Đọc các ảnh kết quả
    def _load(name):
        p = os.path.join(out_dir, name)
        return PILImage.open(p) if os.path.exists(p) else None

    fuse_img    = _load("fuse.jpg")
    text_en_img = _load("text_en.jpg")
    text_vi_img = _load("text_vi.jpg")
    back_img    = _load("back.jpg")
    original_img = _load("input.jpg")
    ocr_text = _read_text_file(os.path.join(out_dir, "ocr.txt"))
    qa_report = _read_json_file(os.path.join(out_dir, "qa.json"))
    debug_payload = _read_json_file(os.path.join(out_dir, "debug", "09_pipeline_debug.json"))

    result_label = f"✅ Dịch thành công!\n\n{translated_text}" if translated_text else "⚠️ Không phát hiện chữ tiếng Anh trong ảnh."
    result_label += _format_qa_suffix(qa_report)

    return fuse_img, text_en_img, text_vi_img, back_img, original_img, ocr_text, result_label, debug_payload


# ═══════════════════════════════════════════════════════════════════════════════
# Streaming version — yields partial results after each text line is translated
# ═══════════════════════════════════════════════════════════════════════════════

@spaces.GPU
def translate_image_stream(input_image):
    """
    Generator version of translate_image.
    Yields (fuse_partial, text_en_img, text_vi_img, back_img, original_img, ocr_text, status_text)
    after each pipeline event so Gradio can update the UI incrementally.
    """
    from PIL import Image as PILImage
    import io as _io

    if input_image is None:
        yield None, None, None, None, None, "", "⚠️ Vui lòng tải ảnh lên trước."
        return

    uid     = str(uuid.uuid4())
    out_dir = str(TEMP_ROOT / uid)
    os.makedirs(out_dir, exist_ok=True)

    input_path = os.path.join(out_dir, "input.jpg")
    if isinstance(input_image, PILImage.Image):
        input_image.convert("RGB").save(input_path, "JPEG", quality=95)
    else:
        import numpy as np_mod
        PILImage.fromarray(input_image).convert("RGB").save(input_path, "JPEG", quality=95)
    original_pil = PILImage.open(input_path).convert("RGB")

    # State accumulators
    text_en_pil = None
    back_pil    = None
    fuse_pil    = None
    text_vi_pil = None
    ocr_text    = ""
    status      = "⏳ Đang khởi động pipeline..."

    try:
        for event in dbx_pipeline.run_inference_streaming(input_path, out_dir):
            etype = event.get("event", "")

            if etype == "stage":
                status = f"⏳ {event.get('message', '')}"
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

            elif etype == "ocr_done":
                text_en_pil = event.get("text_en_pil")
                ocr_text = event.get("ocr_text", ocr_text)
                status = f"🔍 OCR xong — phát hiện {event.get('count', 0)} vùng cần dịch"
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

            elif etype == "back_done":
                back_pil = event.get("back_pil")
                # Show background as initial fuse placeholder
                fuse_pil = back_pil
                status = "🖼️ Đã xóa chữ gốc — bắt đầu dịch từng dòng..."
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

            elif etype == "translating":
                idx   = event.get("index", 0)
                total = event.get("total", 1)
                en    = event.get("text_en", "")
                status = f"🔤 Đang dịch [{idx + 1}/{total}]: \"{en[:40]}{'…' if len(en) > 40 else ''}\""
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

            elif etype == "line_done":
                idx   = event.get("index", 0)
                total = event.get("total", 1)
                en    = event.get("text_en", "")
                vi    = event.get("text_vi", "")
                fuse_pil = event.get("partial_fuse_pil", fuse_pil)
                status = f"✏️ [{idx + 1}/{total}] \"{en[:30]}\" → \"{vi[:30]}\""
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

            elif etype == "done":
                fuse_pil    = event.get("fuse_pil",    fuse_pil)
                text_en_pil = event.get("text_en_pil", text_en_pil)
                text_vi_pil = event.get("text_vi_pil", text_vi_pil)
                back_pil    = event.get("back_pil",    back_pil)
                tit         = event.get("tit", "")
                ocr_text    = event.get("ocr_text", ocr_text)
                qa_report   = event.get("qa") or _read_json_file(os.path.join(out_dir, "qa.json"))
                status = f"✅ Dịch thành công!\n\n{tit}" if tit else "⚠️ Không phát hiện chữ tiếng Anh trong ảnh."
                status += _format_qa_suffix(qa_report)
                yield fuse_pil, text_en_pil, text_vi_pil, back_pil, original_pil, ocr_text, status

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield None, None, None, None, original_pil, ocr_text, f"❌ Lỗi pipeline: {e}"


# ═══════════════════════════════════════════════════════════════════════════════
# Giao diện Gradio
# ═══════════════════════════════════════════════════════════════════════════════

_CSS = """
#title { text-align: center; }
#subtitle { text-align: center; color: #888; margin-bottom: 1rem; }
.gr-button-primary { background: linear-gradient(135deg, #667eea, #764ba2) !important; border: none !important; }
.output-panel { border-radius: 12px; }
"""

_DESCRIPTION = """
<div id="title">
  <h1>🦀 VieTrans — Dịch chữ trong ảnh (EN → VI)</h1>
</div>
<div id="subtitle">
  Powered by <b>PaddleOCR PP-OCRv5</b> &amp; <b>NLLB-200 1.3B fine-tuned</b> chạy trên Hugging Face ZeroGPU
</div>
"""

_ARTICLE = """
### Hướng dẫn sử dụng
1. **Tải ảnh** chứa văn bản tiếng Anh lên ô bên trái.
2. Nhấn nút **Dịch ảnh** và chờ khoảng 10–30 giây (lần đầu cần warm-up GPU).
3. Xem ảnh kết quả và văn bản đã dịch ở phía bên phải.

### Pipeline
```
Ảnh đầu vào → OCR PP-OCRv5 (CPU) → NLLB 1.3B fine-tuned (GPU)
           → OpenCV Inpainting → Render chữ tiếng Việt
```

### Lưu ý
- **ZeroGPU** cấp phát GPU động: mỗi lần nhấn nút là một phiên GPU mới.
- Ảnh quá lớn (>10MB) sẽ bị từ chối.
- Model NLLB được fine-tune trên corpus subtitle EN↔VI.
"""

with gr.Blocks(css=_CSS, theme=gr.themes.Soft(), title="VieTrans — In-Image Translation") as demo:
    gr.HTML(_DESCRIPTION)

    with gr.Row(equal_height=True):
        # ── Cột trái: Input ──────────────────────────────────────────────────
        with gr.Column(scale=1):
            input_img = gr.Image(
                type="pil",
                label="📷 Ảnh đầu vào (Tiếng Anh)",
                height=400,
            )
            with gr.Row():
                btn_stream    = gr.Button("⚡ Dịch (streaming)", variant="primary", scale=3)
                btn_translate = gr.Button("🚀 Dịch (batch)", variant="secondary", scale=2)
                btn_original  = gr.Button("👁️ Ảnh gốc", variant="secondary", scale=1)
                btn_clear     = gr.ClearButton(
                    components=[input_img],
                    value="🗑️ Xóa",
                    scale=1,
                )

        # ── Cột phải: Output chính ───────────────────────────────────────────
        with gr.Column(scale=1):
            output_fuse = gr.Image(
                type="pil",
                label="✅ Kết quả — Ảnh đã dịch (VI)",
                height=400,
                elem_classes=["output-panel"],
            )
            translated_text = gr.Textbox(
                label="📝 Trạng thái / Văn bản dịch",
                lines=4,
                interactive=False,
            )
            ocr_text = gr.Textbox(
                label="📋 Văn bản trong ảnh (OCR)",
                lines=4,
                interactive=False,
                show_copy_button=True,
            )
            debug_json = gr.JSON(label="Debug payload", visible=False)

    # ── Bước trung gian (Accordion) ───────────────────────────────────────────
    with gr.Accordion("🔬 Các bước xử lý trung gian", open=False):
        with gr.Row():
            output_original = gr.Image(
                type="pil",
                label="👁️ Ảnh gốc",
                height=280,
            )
            output_text_en = gr.Image(
                type="pil",
                label="🔴 Stage 1 — Phát hiện vùng chữ EN",
                height=280,
            )
            output_back = gr.Image(
                type="pil",
                label="🟡 Stage 3 — Nền sau khi xóa chữ",
                height=280,
            )
            output_text_vi = gr.Image(
                type="pil",
                label="🟢 Stage 4 — Vùng chữ VI",
                height=280,
            )

    gr.Markdown(_ARTICLE)

    # ── Examples ─────────────────────────────────────────────────────────────
    # Đặt ảnh mẫu vào thư mục examples/ trong Space
    # gr.Examples(
    #     examples=[["examples/sample1.jpg"], ["examples/sample2.jpg"]],
    #     inputs=[input_img],
    # )

    # ── Kết nối sự kiện ───────────────────────────────────────────────────────
    btn_original.click(
        fn=lambda img: img,
        inputs=[input_img],
        outputs=[output_original],
    )

    # Streaming (line-by-line, used by FastAPI proxy via gradio_client)
    btn_stream.click(
        fn=translate_image_stream,
        inputs=[input_img],
        outputs=[output_fuse, output_text_en, output_text_vi, output_back, output_original, ocr_text, translated_text],
        api_name="translate_stream",
        concurrency_limit=SPACE_CONCURRENCY,
    )

    # Batch (full pipeline, backward-compatible)
    btn_translate.click(
        fn=translate_image,
        inputs=[input_img],
        outputs=[output_fuse, output_text_en, output_text_vi, output_back, output_original, ocr_text, translated_text, debug_json],
        api_name="translate",
        concurrency_limit=SPACE_CONCURRENCY,
    )


# ─── Launch ────────────────────────────────────────────────────────────────────
demo.queue(default_concurrency_limit=SPACE_CONCURRENCY, max_size=SPACE_QUEUE_MAX_SIZE)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
