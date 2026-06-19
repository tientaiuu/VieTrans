"""
VieTrans Inference Pipeline (Modified-DebackX) — HuggingFace Space Edition
───────────────────────────────────────────────────────────────────────────
Modular pipeline: PaddleOCR PP-OCRv5 → NLLB Translation → OpenCV Inpainting → Adaptive Rendering

Adaptation từ BE-Models/server/inference.py để chạy trên HuggingFace Space với ZeroGPU:
  - PaddleOCR PP-OCRv5 chạy trên CPU (ổn định, không cần GPU cho OCR)
  - NLLB-200 1.3B fine-tuned chạy trên CUDA (cấp phát qua @spaces.GPU)
  - Bỏ toàn bộ Windows-specific workarounds (PIR patch, oneDNN flags)
  - Sử dụng HuggingFace Hub ID thay vì local path cho model
"""

import os
import sys
import warnings
import gc
import tempfile
from pathlib import Path

# --- PaddlePaddle PIR+oneDNN fix ---
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
                print("[Pipeline Patch] Force-disabled enable_new_ir on Config")
            except Exception as e:
                print(f"[Pipeline Patch] Failed to disable new IR: {e}")
        return _orig_create_predictor(config, *args, **kwargs)

    pd_inf.create_predictor = _patched_create_predictor

    _orig_Predictor = pd_inf.Predictor
    class PatchedPredictor(_orig_Predictor):
        def __init__(self, config, *args, **kwargs):
            if hasattr(config, "enable_new_ir"):
                try:
                    config.enable_new_ir(False)
                    print("[Pipeline Patch] Force-disabled enable_new_ir in Predictor constructor")
                except Exception as e:
                    print(f"[Pipeline Patch] Failed to disable new IR in Predictor: {e}")
            super().__init__(config, *args, **kwargs)

    pd_inf.Predictor = PatchedPredictor
    print("[Pipeline Patch] Monkeypatched paddle.inference Predictor and create_predictor successfully")
except Exception as patch_err:
    print(f"[Pipeline Patch] Failed to patch paddle.inference: {patch_err}")




import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)


def _safe_print(*args, **kwargs):
    """Print an thư chắc chắn không gây UnicodeEncodeError."""
    try:
        print(*args, **kwargs)
    except UnicodeEncodeError:
        msg = ' '.join(str(a) for a in args)
        print(msg.encode('ascii', errors='replace').decode('ascii'))


# ─── Cấu hình qua biến môi trường ────────────────────────────────────────────
# Mặc định trỏ vào HuggingFace Hub ID của model đã fine-tune
NLLB_MODEL_PATH = os.getenv("NLLB_MODEL_PATH", "facebook/nllb-200-1.3B")
NLLB_SRC_LANG   = os.getenv("NLLB_SRC_LANG",   "eng_Latn")
NLLB_TGT_LANG   = os.getenv("NLLB_TGT_LANG",   "vie_Latn")
OCR_MIN_CONFIDENCE = float(os.getenv("OCR_MIN_CONFIDENCE", "0.5"))
RENDER_FONT_PATH   = os.getenv("RENDER_FONT_PATH", "")

# Đường dẫn font cho Linux (HuggingFace Space chạy trên Ubuntu/Debian)
FONT_SEARCH_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    # fallback Windows (nếu test local)
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
]


def _find_system_font():
    """Tìm font phù hợp với tiếng Việt (có dấu)."""
    if RENDER_FONT_PATH and os.path.exists(RENDER_FONT_PATH):
        return RENDER_FONT_PATH
    for font_path in FONT_SEARCH_PATHS:
        if os.path.exists(font_path):
            return font_path
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# Utility functions – OCR result parsing
# ═══════════════════════════════════════════════════════════════════════════════

def _polygon_to_box(polygon):
    """Chuyển polygon thành bounding box (x1, y1, x2, y2)."""
    points = np.array(polygon, dtype=np.float32)
    return (
        float(points[:, 0].min()),
        float(points[:, 1].min()),
        float(points[:, 0].max()),
        float(points[:, 1].max()),
    )


def _normalize_polygon(raw_polygon):
    """Chuẩn hóa polygon thành list [[float, float], ...]."""
    return [[float(pt[0]), float(pt[1])] for pt in raw_polygon]


def _as_python_list(value):
    if value is None:
        return []
    if hasattr(value, "tolist"):
        return value.tolist()
    return list(value)


def _result_to_dict(result):
    """Trích xuất dict payload từ object kết quả PaddleOCR."""
    if isinstance(result, dict):
        payload = result
    elif hasattr(result, "json"):
        raw = result.json
        payload = raw() if callable(raw) else raw
    elif hasattr(result, "res"):
        payload = result.res
    else:
        payload = vars(result) if hasattr(result, "__dict__") else {}

    if isinstance(payload, dict) and "res" in payload:
        return payload["res"]
    return payload


def _parse_paddleocr_result(result, min_confidence):
    """
    Parse kết quả PaddleOCR PP-OCRv5 thành list vùng văn bản.
    Mỗi phần tử: {polygon, box, detector_text, detector_confidence}
    """
    payload = _result_to_dict(result)
    if not isinstance(payload, dict):
        return []

    texts    = _as_python_list(payload.get("rec_texts"))
    scores   = _as_python_list(payload.get("rec_scores"))
    polygons = payload.get("rec_polys") or payload.get("dt_polys")
    polygons = _as_python_list(polygons)

    regions = []
    for idx, text in enumerate(texts):
        text = str(text).strip()
        if not text:
            continue
        confidence = float(scores[idx]) if idx < len(scores) else 1.0
        if confidence < min_confidence:
            continue

        polygon = None
        if idx < len(polygons):
            polygon = _normalize_polygon(polygons[idx])
        if not polygon:
            continue

        regions.append({
            "index":               idx,
            "polygon":             polygon,
            "box":                 _polygon_to_box(polygon),
            "detector_text":       text,
            "detector_confidence": confidence,
        })
    return regions


def _parse_legacy_paddleocr_result(result, min_confidence):
    """Parse định dạng PaddleOCR cũ (list of [polygon, (text, score)])."""
    if not result:
        return []
    page = result[0] if len(result) == 1 and isinstance(result[0], list) else result
    regions = []
    for idx, item in enumerate(page or []):
        if not item or len(item) < 2:
            continue
        polygon    = _normalize_polygon(item[0])
        text, conf = item[1]
        text = str(text).strip()
        if not text or float(conf) < min_confidence:
            continue
        regions.append({
            "index":               idx,
            "polygon":             polygon,
            "box":                 _polygon_to_box(polygon),
            "detector_text":       text,
            "detector_confidence": float(conf),
        })
    return regions


# ═══════════════════════════════════════════════════════════════════════════════
# Adaptive Text Renderer
# ═══════════════════════════════════════════════════════════════════════════════

def _luminance(color):
    r, g, b = color[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _adaptive_text_color(image, box):
    """Chọn màu chữ đen/trắng dựa trên độ sáng nền."""
    x1, y1, x2, y2 = [int(v) for v in box]
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(image.width, x2); y2 = min(image.height, y2)
    if x2 <= x1 or y2 <= y1:
        return (255, 255, 255)
    crop = image.crop((x1, y1, x2, y2))
    avg_color = np.array(crop).mean(axis=(0, 1))
    return (0, 0, 0) if _luminance(avg_color) > 127 else (255, 255, 255)


def _load_font(font_path, size):
    if font_path:
        try:
            return ImageFont.truetype(font_path, size, encoding="utf-8")
        except (OSError, IOError):
            pass
    try:
        return ImageFont.truetype("arial.ttf", size)
    except (OSError, IOError):
        return ImageFont.load_default()


def _text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _wrap_text(draw, text, font, max_width):
    words = text.split()
    if not words:
        return [""]
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        w, _ = _text_size(draw, candidate, font)
        if w <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            if _text_size(draw, word, font)[0] <= max_width:
                current = word
            else:
                piece = ""
                for ch in word:
                    cand = piece + ch
                    if _text_size(draw, cand, font)[0] <= max_width:
                        piece = cand
                    else:
                        if piece:
                            lines.append(piece)
                        piece = ch
                current = piece
    if current:
        lines.append(current)
    return lines


def _fit_font_and_wrap(draw, text, box_width, box_height, font_path,
                       min_size=8, max_size=72, h_pad=4, v_pad=2):
    max_text_w = max(1, box_width  - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)

    for size in range(max_size, min_size - 1, -1):
        font = _load_font(font_path, size)
        lines = _wrap_text(draw, text, font, max_text_w)
        _, line_h = _text_size(draw, "Áy", font)
        total_h  = line_h * len(lines)
        widest   = max((_text_size(draw, ln, font)[0] for ln in lines), default=0)
        if widest <= max_text_w and total_h <= max_text_h:
            return font, lines, line_h

    font = _load_font(font_path, min_size)
    lines = _wrap_text(draw, text, font, max_text_w)
    _, line_h = _text_size(draw, "Áy", font)
    return font, lines, line_h


def _draw_text_on_image(image, box, text, font_path):
    x1, y1, x2, y2 = [int(v) for v in box]
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)

    draw = ImageDraw.Draw(image)
    font, lines, line_h = _fit_font_and_wrap(draw, text, box_w, box_h, font_path)
    text_color   = _adaptive_text_color(image, box)
    stroke_color = (0, 0, 0) if text_color == (255, 255, 255) else (255, 255, 255)

    total_text_h = line_h * len(lines)
    y_start      = y1 + max(0, (box_h - total_text_h) // 2)

    for line in lines:
        w, _ = _text_size(draw, line, font)
        x_start = x1 + max(0, (box_w - w) // 2)
        draw.text(
            (x_start, y_start), line, fill=text_color, font=font,
            stroke_width=1, stroke_fill=stroke_color,
        )
        y_start += line_h

    return image


# ═══════════════════════════════════════════════════════════════════════════════
# OpenCV Inpainting
# ═══════════════════════════════════════════════════════════════════════════════

def _create_text_mask(image_shape, regions):
    h, w = image_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for region in regions:
        polygon = np.array(region["polygon"], dtype=np.int32)
        cv2.fillPoly(mask, [polygon], 255)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mask   = cv2.dilate(mask, kernel, iterations=2)
    return mask


def _inpaint_text(image_np, mask):
    if mask.max() == 0:
        return image_np
    return cv2.inpaint(image_np, mask, inpaintRadius=7, flags=cv2.INPAINT_TELEA)


# ═══════════════════════════════════════════════════════════════════════════════
# Main Pipeline Class — Space Edition
# ═══════════════════════════════════════════════════════════════════════════════

class DebackPipeline:
    """
    Modified-DebackX Pipeline — HuggingFace Space Edition.

    Thay đổi so với bản local:
      - PaddleOCR dùng device="cpu" (CPU, stable trên Linux Space)
      - NLLB model được load lên 'cuda' ở cấp module (ZeroGPU emulates CUDA)
      - Không có Windows PIR/oneDNN patch
      - NLLB_MODEL_PATH trỏ vào HuggingFace Hub ID

    API Contract:
        load_models()                  – gọi 1 lần khi khởi động
        run_inference(path, dir) -> str – chạy full pipeline, trả về bản dịch
    """

    def __init__(self):
        import torch
        # ZeroGPU luôn expose 'cuda' khi được kích hoạt bởi @spaces.GPU
        if torch.cuda.is_available():
            self.device = torch.device("cuda")
            print("[Pipeline] Device: CUDA (ZeroGPU)")
        else:
            self.device = torch.device("cpu")
            print("[Pipeline] Device: CPU (no GPU allocated)")

        self.loaded         = False
        self.ocr_engine     = None
        self.nllb_model     = None
        self.nllb_tokenizer = None
        self.font_path      = _find_system_font()

        if self.font_path:
            print(f"[Pipeline] Font: {self.font_path}")
        else:
            print("[Pipeline] Warning: Không tìm thấy font hệ thống, dùng PIL default.")

    def load_models(self):
        """Khởi tạo OCR engine và NLLB model. Gọi ở cấp module (startup)."""
        import torch
        print("[Pipeline] Đang tải các mô hình...")

        # ── 1. PaddleOCR PP-OCRv5 (chạy CPU để tránh xung đột với ZeroGPU) ──
        print("[Pipeline] Loading PaddleOCR PP-OCRv5 (CPU mode)...")
        from paddleocr import PaddleOCR

        # --- Disable PIR executor patch ---
        try:
            from paddlex.inference.models.runners.paddle_static.runner import (
                PaddleStaticRunner as _PSR,
            )
            if not getattr(_PSR._create, "_pir_patched", False):
                _orig_create = _PSR._create

                def _create_no_pir(self):
                    self._config["enable_new_ir"] = False
                    return _orig_create(self)

                _create_no_pir._pir_patched = True
                _PSR._create = _create_no_pir
                print("[Pipeline] Applied PIR executor disable patch (Space workaround)")
        except Exception as _patch_err:
            print(f"[Pipeline] Warning: could not apply PIR patch: {_patch_err}")


        self.ocr_engine = PaddleOCR(
            lang="en",
            ocr_version="PP-OCRv5",
            device="cpu",                        # ← BẮT BUỘC cpu trên ZeroGPU (PaddleOCR v3+)
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            enable_mkldnn=False,                 # ← TẮT mkldnn/oneDNN trên CPU để tránh lỗi ConvertPirAttribute
        )
        print("[Pipeline] PaddleOCR PP-OCRv5 loaded.")

        # ── 2. NLLB-200 1.3B fine-tuned ──────────────────────────────────────
        print(f"[Pipeline] Loading NLLB từ: {NLLB_MODEL_PATH}")
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self.nllb_tokenizer = AutoTokenizer.from_pretrained(
            NLLB_MODEL_PATH, src_lang=NLLB_SRC_LANG
        )
        self.nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
            NLLB_MODEL_PATH,
            torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
            low_cpu_mem_usage=True,
        )
        # Di chuyển lên cuda ở cấp module – ZeroGPU emulate CUDA an toàn tại đây
        self.nllb_model = self.nllb_model.to(self.device)
        self.nllb_model.eval()

        gc.collect()
        if self.device.type == "cuda":
            torch.cuda.empty_cache()

        self.loaded = True
        print("[Pipeline] Tất cả mô hình đã được tải thành công.")

    # ──────────────────────────────────────────────────────────────────────────

    def _run_ocr(self, image_path: str):
        """Chạy OCR trên ảnh, trả về list vùng văn bản."""
        raw_results = self.ocr_engine.predict(str(image_path))

        regions = []
        for result in (raw_results or []):
            parsed = _parse_paddleocr_result(result, OCR_MIN_CONFIDENCE)
            if parsed:
                regions.extend(parsed)
                break

        # Fallback: định dạng cũ list-of-lists
        if not regions and raw_results:
            try:
                regions = _parse_legacy_paddleocr_result(raw_results, OCR_MIN_CONFIDENCE)
            except Exception:
                pass

        return regions

    def _translate_texts(self, texts: list[str]) -> list[str]:
        """Dịch batch văn bản EN → VI bằng NLLB."""
        import torch
        if not texts:
            return []

        translations = []
        batch_size   = 8

        for i in range(0, len(texts), batch_size):
            batch  = texts[i : i + batch_size]
            inputs = self.nllb_tokenizer(
                batch,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128,
            ).to(self.device)

            with torch.no_grad():
                tgt_lang_id = self.nllb_tokenizer.convert_tokens_to_ids(NLLB_TGT_LANG)
                generated   = self.nllb_model.generate(
                    **inputs,
                    forced_bos_token_id=tgt_lang_id,
                    max_new_tokens=128,
                    num_beams=5,
                    early_stopping=True,
                )
            decoded = self.nllb_tokenizer.batch_decode(generated, skip_special_tokens=True)
            translations.extend(decoded)

        return translations

    # ──────────────────────────────────────────────────────────────────────────

    def run_inference(self, input_img_path: str, output_dir: str) -> str:
        """
        Chạy full pipeline trên một ảnh.

        Outputs vào output_dir:
            back.jpg    – nền đã xóa chữ
            text_en.jpg – ảnh highlight vùng chữ EN
            text_vi.jpg – ảnh highlight vùng chữ VI
            fuse.jpg    – kết quả cuối (nền + chữ VI)
            tit.txt     – chuỗi bản dịch

        Returns: chuỗi bản dịch tổng hợp.
        """
        if not self.loaded:
            self.load_models()

        os.makedirs(output_dir, exist_ok=True)

        back_path    = os.path.join(output_dir, "back.jpg")
        text_en_path = os.path.join(output_dir, "text_en.jpg")
        text_vi_path = os.path.join(output_dir, "text_vi.jpg")
        fuse_path    = os.path.join(output_dir, "fuse.jpg")
        tit_path     = os.path.join(output_dir, "tit.txt")

        original_pil = Image.open(input_img_path).convert("RGB")
        original_np  = np.array(original_pil)

        # ─── Stage 1: OCR ────────────────────────────────────────────────────
        print("[Pipeline] Stage 1: OCR…")
        regions  = self._run_ocr(input_img_path)
        en_texts = [r["detector_text"] for r in regions]
        print(f"[Pipeline]   Phát hiện {len(regions)} vùng chữ")

        # Lưu text_en.jpg
        text_en_img = original_pil.copy()
        draw_en     = ImageDraw.Draw(text_en_img)
        for region in regions:
            polygon = [(int(p[0]), int(p[1])) for p in region["polygon"]]
            draw_en.polygon(polygon, outline=(255, 0, 0), width=2)
            x1, y1 = int(region["box"][0]), int(region["box"][1])
            font_sm = _load_font(self.font_path, 12)
            draw_en.text((x1, max(0, y1 - 14)), region["detector_text"],
                         fill=(255, 0, 0), font=font_sm)
        text_en_img.save(text_en_path, "JPEG", quality=95)

        # ─── Stage 2: Translation EN → VI ────────────────────────────────────
        print("[Pipeline] Stage 2: Dịch văn bản…")
        vi_texts       = self._translate_texts(en_texts)
        translated_str = " | ".join(vi_texts) if vi_texts else ""
        with open(tit_path, "w", encoding="utf-8") as f:
            f.write(translated_str)
        _safe_print(f"[Pipeline]   Bản dịch: {translated_str[:120]}…")

        # ─── Stage 3: Inpainting (xóa chữ EN) ────────────────────────────────
        print("[Pipeline] Stage 3: Inpainting…")
        mask         = _create_text_mask(original_np.shape, regions)
        inpainted_np = _inpaint_text(original_np, mask)
        inpainted_pil = Image.fromarray(inpainted_np)
        inpainted_pil.save(back_path, "JPEG", quality=95)

        # ─── Stage 4: Render tiếng Việt ──────────────────────────────────────
        print("[Pipeline] Stage 4: Vẽ văn bản tiếng Việt…")
        fuse_img     = inpainted_pil.copy()
        text_vi_img  = inpainted_pil.copy()
        enhancer     = ImageEnhance.Brightness(text_vi_img)
        text_vi_img  = enhancer.enhance(0.6)

        for region, vi_text in zip(regions, vi_texts):
            if not vi_text.strip():
                continue
            box = region["box"]
            _draw_text_on_image(fuse_img,    box, vi_text, self.font_path)
            _draw_text_on_image(text_vi_img, box, vi_text, self.font_path)

        text_vi_img.save(text_vi_path, "JPEG", quality=95)
        fuse_img.save(fuse_path,       "JPEG", quality=95)

        print("[Pipeline] Hoàn tất.")
        return translated_str


# ─── Singleton toàn cục ───────────────────────────────────────────────────────
# Được tạo khi import; load_models() gọi sau trong app.py
pipeline = DebackPipeline()
