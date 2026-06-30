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
import re
import math
import warnings
import gc
import tempfile
from pathlib import Path
from functools import lru_cache

_INFERENCE_DIR = Path(__file__).resolve().parent
if str(_INFERENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_INFERENCE_DIR))

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
NLLB_MODEL_PATH = os.getenv("NLLB_MODEL_PATH", "masterdzzzz/mt-nllb-1p3b-en-vi")
NLLB_SRC_LANG   = os.getenv("NLLB_SRC_LANG",   "eng_Latn")
NLLB_TGT_LANG   = os.getenv("NLLB_TGT_LANG",   "vie_Latn")
OCR_MIN_CONFIDENCE = float(os.getenv("OCR_MIN_CONFIDENCE", "0.5"))
RENDER_FONT_PATH   = os.getenv("RENDER_FONT_PATH", "")

# Đường dẫn font cho Linux (HuggingFace Space chạy trên Ubuntu/Debian)
FONT_SEARCH_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Oblique.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    # fallback Windows (nếu test local)
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/ariali.ttf",
    "C:/Windows/Fonts/arialbi.ttf",
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


@lru_cache(maxsize=1)
def _system_font_files():
    font_dirs = [
        Path("C:/Windows/Fonts"),
        Path("/usr/share/fonts/truetype"),
        Path("/usr/share/fonts/opentype"),
        Path.home() / ".fonts",
        Path.home() / ".local/share/fonts",
    ]
    extensions = ("*.ttf", "*.otf", "*.ttc")
    files = []
    for font_dir in font_dirs:
        if not font_dir.exists():
            continue
        for pattern in extensions:
            try:
                files.extend(str(path) for path in font_dir.rglob(pattern))
            except OSError:
                continue

    preferred = (
        "arial", "arlr", "segoe", "aptos", "calibri", "candara", "verdana",
        "tahoma", "trebuc", "century", "bahnschrift", "poppins", "montserrat",
        "nunito", "inter", "roboto", "opensans", "open sans", "lato", "noto",
        "dejavu", "liberation", "free",
    )

    def priority(path):
        name = Path(path).name.lower()
        rank = next((idx for idx, term in enumerate(preferred) if term in name), len(preferred))
        return rank, name

    return tuple(sorted(set(files), key=priority))


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

VIETNAMESE_MARK_RE = re.compile(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.IGNORECASE)
LATIN_WORD_RE = re.compile(r"[A-Za-z]{2,}")
VIETNAMESE_WORDS = {
    "ban", "biet", "cac", "chung", "cua", "duoc", "hoc", "khong", "minh",
    "mot", "muon", "ngay", "nguoi", "nhieu", "nhung", "phai", "rang",
    "sinh", "thich", "tieng", "toi", "trong", "viet", "viec",
}
STRONG_VIETNAMESE_WORDS = {
    "khong", "nguoi", "nhieu", "nhung", "duoc", "trong", "viet", "cung",
    "chung", "thich", "viec", "phai", "rang", "muon",
}

UI_TRANSLATION_GLOSSARY = {
    "settings": "Cài đặt",
    "airplane mode": "Chế độ máy bay",
    "dual sim and mobile network": "Dual SIM và mạng di động",
    "dual sim and mobile networks": "Dual SIM và mạng di động",
    "mobile network": "Mạng di động",
    "mobile networks": "Mạng di động",
    "other wireless connections": "Các kết nối không dây khác",
    "notification and status bar": "Thanh thông báo và trạng thái",
    "notification status bar": "Thanh thông báo và trạng thái",
    "notifications and status bar": "Thanh thông báo và trạng thái",
    "do not disturb mode": "Chế độ không làm phiền",
    "no disturb mode": "Chế độ không làm phiền",
    "display and brightness": "Màn hình và độ sáng",
    "lockscreen magazine and wallpaper": "Tạp chí màn hình khóa và hình nền",
    "lock screen magazine and wallpaper": "Tạp chí màn hình khóa và hình nền",
    "sound and vibrate": "Âm thanh và rung",
    "sound and vibration": "Âm thanh và rung",
    "fingerprint and passcode": "Vân tay và mật mã",
    "fingerprint and password": "Vân tay và mật khẩu",
    "password and security": "Mật khẩu và bảo mật",
    "status bar": "Thanh trạng thái",
    "notification bar": "Thanh thông báo",
    "on": "Bật",
    "off": "Tắt",
}

UI_KEEP_AS_IS = {
    "bluetooth",
    "wi fi",
    "wifi",
    "wi-fi",
    "sim",
}

UI_ALLOWED_UNTRANSLATED_TOKENS = {
    "bluetooth", "dual", "sim", "wi", "fi", "wifi", "lte", "5g", "4g",
    "usb", "vpn", "nfc", "gps", "id",
}

UI_PHRASE_TRANSLATIONS = {
    "airplane mode": "chế độ máy bay",
    "do not disturb": "không làm phiền",
    "do not disturb mode": "chế độ không làm phiền",
    "mobile network": "mạng di động",
    "mobile networks": "mạng di động",
    "wireless connection": "kết nối không dây",
    "wireless connections": "kết nối không dây",
    "other wireless connection": "kết nối không dây khác",
    "other wireless connections": "các kết nối không dây khác",
    "status bar": "thanh trạng thái",
    "notification bar": "thanh thông báo",
    "notification status bar": "thanh thông báo và trạng thái",
    "notification and status bar": "thanh thông báo và trạng thái",
    "lock screen": "màn hình khóa",
    "lockscreen": "màn hình khóa",
    "lockscreen magazine": "tạp chí màn hình khóa",
    "lock screen magazine": "tạp chí màn hình khóa",
    "home screen": "màn hình chính",
    "screen lock": "khóa màn hình",
    "display brightness": "màn hình và độ sáng",
    "sound vibration": "âm thanh và rung",
    "sound vibrate": "âm thanh và rung",
    "fingerprint passcode": "vân tay và mật mã",
    "fingerprint password": "vân tay và mật khẩu",
    "password security": "mật khẩu và bảo mật",
    "privacy security": "quyền riêng tư và bảo mật",
}

UI_WORD_TRANSLATIONS = {
    "about": "giới thiệu",
    "accessibility": "trợ năng",
    "account": "tài khoản",
    "accounts": "tài khoản",
    "advanced": "nâng cao",
    "airplane": "máy bay",
    "app": "ứng dụng",
    "apps": "ứng dụng",
    "backup": "sao lưu",
    "bar": "thanh",
    "battery": "pin",
    "brightness": "độ sáng",
    "cellular": "di động",
    "connection": "kết nối",
    "connections": "kết nối",
    "data": "dữ liệu",
    "display": "màn hình",
    "disturb": "làm phiền",
    "download": "tải xuống",
    "downloads": "tải xuống",
    "face": "khuôn mặt",
    "fingerprint": "vân tay",
    "general": "chung",
    "home": "chính",
    "language": "ngôn ngữ",
    "lock": "khóa",
    "lockscreen": "màn hình khóa",
    "magazine": "tạp chí",
    "mobile": "di động",
    "mode": "chế độ",
    "network": "mạng",
    "networks": "mạng",
    "notification": "thông báo",
    "notifications": "thông báo",
    "other": "khác",
    "passcode": "mật mã",
    "password": "mật khẩu",
    "privacy": "quyền riêng tư",
    "screen": "màn hình",
    "security": "bảo mật",
    "setting": "cài đặt",
    "settings": "cài đặt",
    "sound": "âm thanh",
    "status": "trạng thái",
    "storage": "bộ nhớ",
    "sync": "đồng bộ",
    "system": "hệ thống",
    "theme": "chủ đề",
    "update": "cập nhật",
    "updates": "cập nhật",
    "vibrate": "rung",
    "vibration": "rung",
    "wallpaper": "hình nền",
    "wireless": "không dây",
}

UI_CONNECTOR_TRANSLATIONS = {"and": "và", "or": "hoặc"}


def _ui_text_key(text: str) -> str:
    key = str(text or "").strip().lower()
    key = re.sub(r"\bwi[\s-]?fi\b", "wi-fi", key)
    key = key.replace("&", " and ")
    key = re.sub(r"[›»>]+$", "", key).strip()
    key = re.sub(r"[^a-z0-9.+-]+", " ", key)
    return re.sub(r"\s+", " ", key).strip()


def _split_trailing_ui_suffix(text: str):
    match = re.search(r"(\s*[›»>]+)\s*$", str(text or ""))
    if not match:
        return str(text or "").strip(), ""
    return str(text or "")[:match.start()].strip(), match.group(1).strip()


def _capitalize_vi_label(text: str) -> str:
    text = re.sub(r"\s+", " ", str(text or "").strip())
    if not text:
        return text
    return text[0].upper() + text[1:]


def _translate_ui_key_by_terms(key: str):
    tokens = key.split()
    if not tokens:
        return None

    pieces = []
    translated_count = 0
    unknown_count = 0
    max_phrase_len = min(4, len(tokens))
    i = 0
    while i < len(tokens):
        matched = False
        for phrase_len in range(max_phrase_len, 1, -1):
            phrase = " ".join(tokens[i:i + phrase_len])
            translated = UI_PHRASE_TRANSLATIONS.get(phrase)
            if translated:
                pieces.append(translated)
                translated_count += phrase_len
                i += phrase_len
                matched = True
                break
        if matched:
            continue

        token = tokens[i]
        connector = UI_CONNECTOR_TRANSLATIONS.get(token)
        if connector:
            if pieces and pieces[-1] != connector:
                pieces.append(connector)
            i += 1
            continue

        translated = UI_WORD_TRANSLATIONS.get(token)
        if translated is None and token not in UI_ALLOWED_UNTRANSLATED_TOKENS:
            from difflib import get_close_matches
            matches = get_close_matches(token, UI_WORD_TRANSLATIONS.keys(), n=1, cutoff=0.84)
            if matches and abs(len(matches[0]) - len(token)) <= 3:
                translated = UI_WORD_TRANSLATIONS[matches[0]]
        if translated:
            pieces.append(translated)
            translated_count += 1
        elif token in UI_ALLOWED_UNTRANSLATED_TOKENS:
            pieces.append(token.upper() if len(token) <= 3 else token)
        else:
            unknown_count += 1
        i += 1

    if not pieces or unknown_count:
        return None
    if translated_count / max(1, len(tokens)) < 0.55:
        return None

    text = " ".join(piece for piece in pieces if piece)
    text = re.sub(r"\s+([/>])\s+", r" \1 ", text)
    return _capitalize_vi_label(text)


def _glossary_translate(text: str):
    core, suffix = _split_trailing_ui_suffix(text)
    key = _ui_text_key(core)
    if not key:
        return None
    translated = UI_TRANSLATION_GLOSSARY.get(key)
    if translated is None:
        translated = _translate_ui_key_by_terms(key)
    if translated is None:
        return None
    return f"{translated} {suffix}".strip() if suffix else translated


def _latin_token_set(text: str) -> set:
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9+-]*", str(text or ""))
        if len(token) >= 2
    }


def _translation_needs_repair(source: str, translated: str) -> bool:
    source_norm = _ui_text_key(source)
    translated_norm = _ui_text_key(translated)
    if not translated_norm:
        return True
    if source_norm and source_norm == translated_norm and not _is_nontranslatable_ui_token(source):
        return True

    source_tokens = {
        token for token in _latin_token_set(source)
        if token not in UI_ALLOWED_UNTRANSLATED_TOKENS
    }
    translated_tokens = {
        token for token in _latin_token_set(translated)
        if token not in UI_ALLOWED_UNTRANSLATED_TOKENS
    }
    if not source_tokens or not translated_tokens:
        return False

    overlap = source_tokens & translated_tokens
    return len(overlap) >= 2 or (len(overlap) / max(1, len(source_tokens))) >= 0.34


def _repair_translation_if_needed(source: str, translated: str) -> str:
    candidate = str(translated or "").strip()
    lexicon = _glossary_translate(source)
    if lexicon and _translation_needs_repair(source, candidate):
        return lexicon
    return candidate


def _has_ui_translation_path(text: str) -> bool:
    return _glossary_translate(text) is not None


def _is_nontranslatable_ui_token(text: str) -> bool:
    key = _ui_text_key(text)
    return key in UI_KEEP_AS_IS


def _looks_like_domain_or_handle(text: str) -> bool:
    value = str(text or "").strip()
    if "@" in value:
        return True
    return bool(re.search(r"\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\b", value, re.IGNORECASE))


def _is_probably_phonetic(text):
    compact = re.sub(r"\s+", "", text.strip())
    if not compact:
        return False
    if compact[0] in "/[(" and compact[-1] in "/])":
        return True
    if "/" in compact and len(LATIN_WORD_RE.findall(compact)) <= 2:
        return True
    ipa_marks = sum(1 for ch in compact if ch in "ˈˌəʌɪʊɔɑæɛθðŋʃʒɜɒ")
    return ipa_marks >= 1 and len(compact) <= 14


def _has_unaccented_vietnamese_words(text):
    tokens = re.findall(r"[A-Za-z]+", text.lower())
    if not tokens:
        return False

    token_set = set(tokens)
    if len(token_set & STRONG_VIETNAMESE_WORDS) >= 1:
        return True

    vi_hits = token_set & VIETNAMESE_WORDS
    if len(vi_hits) >= 2:
        return True

    compact = " ".join(tokens)
    return "viet nam" in compact or "tieng viet" in compact


def _polygon_horizontal_angle(region):
    polygon = region.get("polygon") or []
    if len(polygon) < 2:
        return 0.0
    points = []
    for point in polygon:
        try:
            points.append((float(point[0]), float(point[1])))
        except (TypeError, ValueError, IndexError):
            return 0.0
    edges = []
    for idx, (x1, y1) in enumerate(points):
        x2, y2 = points[(idx + 1) % len(points)]
        length = math.hypot(x2 - x1, y2 - y1)
        if length > 0:
            edges.append((length, x2 - x1, y2 - y1))
    if not edges:
        return 0.0
    _, dx, dy = max(edges, key=lambda item: item[0])
    angle = abs(math.degrees(math.atan2(dy, dx))) % 180.0
    return 180.0 - angle if angle > 90.0 else angle


def _is_rotated_decorative_region(region, image_size=None):
    angle = _polygon_horizontal_angle(region)
    if angle < 10.0:
        return False
    text = str(region.get("detector_text", "")).strip()
    compact_len = len(re.sub(r"\s+", "", text))
    word_count = len(re.findall(r"[A-Za-z]+", text))
    x1, y1, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    if image_size:
        image_w, image_h = image_size
        margin = max(18.0, min(float(image_w), float(image_h)) * 0.08)
        near_edge = x1 <= margin or y1 <= margin or x2 >= image_w - margin or y2 >= image_h - margin
    else:
        near_edge = x1 <= 36.0 or y1 <= 36.0
    short_label = word_count <= 3 and compact_len <= 18
    return near_edge or short_label


def _should_translate_region(region, image_size=None):
    text = str(region.get("detector_text", "")).strip()
    if not text:
        return False
    if _is_rotated_decorative_region(region, image_size):
        return False

    compact = re.sub(r"\s+", "", text)
    if not compact:
        return False

    if _looks_like_domain_or_handle(text):
        return False
    if _is_nontranslatable_ui_token(text):
        return False
    if re.fullmatch(r"[\d.,:;+\-()]+", compact):
        return False
    if _is_probably_phonetic(text):
        return False
    if VIETNAMESE_MARK_RE.search(text):
        return False
    if _has_unaccented_vietnamese_words(text):
        return False

    letters = re.findall(r"[A-Za-z]", text)
    if len(letters) < 2:
        return False

    visible_chars = re.sub(r"\s+", "", text)
    latin_ratio = len(letters) / max(1, len(visible_chars))
    if latin_ratio < 0.45:
        return False

    x1, y1, x2, y2 = region.get("box", (0, 0, 0, 0))
    if max(1, x2 - x1) < 8 or max(1, y2 - y1) < 6:
        return False

    return bool(LATIN_WORD_RE.search(text))


def _rect_polygon(box):
    x1, y1, x2, y2 = [float(v) for v in box]
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]


def _merge_region_group(group):
    x1 = min(float(r["box"][0]) for r in group)
    y1 = min(float(r["box"][1]) for r in group)
    x2 = max(float(r["box"][2]) for r in group)
    y2 = max(float(r["box"][3]) for r in group)
    line_heights = [max(1.0, float(r["box"][3]) - float(r["box"][1])) for r in group]
    text = " ".join(str(r.get("detector_text", "")).strip() for r in group if str(r.get("detector_text", "")).strip())
    confidence = min(float(r.get("detector_confidence", 1.0)) for r in group)
    return {
        "index": group[0].get("index", 0),
        "polygon": _rect_polygon((x1, y1, x2, y2)),
        "mask_polygons": [r["polygon"] for r in group],
        "source_lines": [
            {
                "text": str(r.get("detector_text", "")).strip(),
                "box": [float(v) for v in r["box"]],
            }
            for r in group
            if str(r.get("detector_text", "")).strip()
        ],
        "box": (x1, y1, x2, y2),
        "detector_text": text,
        "detector_confidence": confidence,
        "layout_type": "paragraph" if len(group) > 1 else "line",
        "line_count": len(group),
        "avg_line_height": sum(line_heights) / max(1, len(line_heights)),
    }


def _is_body_text_line(region, image_width):
    text = str(region.get("detector_text", "")).strip()
    x1, y1, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    box_w = max(1.0, x2 - x1)
    word_count = len(re.findall(r"[A-Za-z]+", text))
    return word_count >= 5 or len(text) >= 34 or box_w >= image_width * 0.32


def _can_merge_lines(previous, current, image_width):
    px1, py1, px2, py2 = [float(v) for v in previous.get("box", (0, 0, 0, 0))]
    cx1, cy1, cx2, cy2 = [float(v) for v in current.get("box", (0, 0, 0, 0))]
    prev_h = max(1.0, py2 - py1)
    curr_h = max(1.0, cy2 - cy1)
    avg_h = (prev_h + curr_h) / 2
    vertical_gap = cy1 - py2
    left_delta = abs(cx1 - px1)
    right_delta = abs(cx2 - px2)
    overlap = max(0.0, min(px2, cx2) - max(px1, cx1))
    narrow_w = max(1.0, min(px2 - px1, cx2 - cx1))

    return (
        -avg_h * 0.35 <= vertical_gap <= max(24.0, avg_h * 1.55)
        and left_delta <= max(34.0, image_width * 0.055)
        and (overlap / narrow_w >= 0.62 or right_delta <= max(56.0, image_width * 0.09))
    )


def _group_paragraph_regions(regions, image_width):
    sorted_regions = sorted(
        regions,
        key=lambda r: (float(r["box"][1]), float(r["box"][0])),
    )
    grouped = []
    current = []

    def flush_current():
        nonlocal current
        if current:
            grouped.append(_merge_region_group(current))
            current = []

    for region in sorted_regions:
        if not _is_body_text_line(region, image_width):
            flush_current()
            grouped.append(_merge_region_group([region]))
            continue

        if current and _can_merge_lines(current[-1], region, image_width):
            current.append(region)
        else:
            flush_current()
            current = [region]

    flush_current()
    return grouped


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


def _font_variant_candidates(font_path, bold=False, italic=False, condensed=False):
    names = []
    if bold and italic:
        names.extend([
            "DejaVuSansCondensed-BoldOblique.ttf" if condensed else "DejaVuSans-BoldOblique.ttf",
            "LiberationSans-BoldItalic.ttf",
            "arialbi.ttf",
        ])
    elif bold:
        names.extend([
            "DejaVuSansCondensed-Bold.ttf" if condensed else "DejaVuSans-Bold.ttf",
            "LiberationSans-Bold.ttf",
            "arialbd.ttf",
        ])
    elif italic:
        names.extend([
            "DejaVuSansCondensed-Oblique.ttf" if condensed else "DejaVuSans-Oblique.ttf",
            "LiberationSans-Italic.ttf",
            "ariali.ttf",
        ])
    elif condensed:
        names.extend([
            "DejaVuSansCondensed.ttf",
            "LiberationSans-Regular.ttf",
            "arial.ttf",
        ])

    candidates = []
    if font_path:
        base = Path(font_path)
        candidates.extend(str(base.with_name(name)) for name in names)
        candidates.append(font_path)
    candidates.extend(FONT_SEARCH_PATHS)
    candidates.extend(_system_font_files())
    return candidates


@lru_cache(maxsize=256)
def _load_font_cached(candidate: str, size: int) -> "ImageFont.FreeTypeFont":
    """Cache font objects theo (path, size) để tránh load disk lặp lại."""
    try:
        return ImageFont.truetype(candidate, size, encoding="utf-8")
    except (OSError, IOError):
        return None


def _load_font(font_path, size, bold=False, italic=False, condensed=False):
    for candidate in _font_variant_candidates(font_path, bold=bold, italic=italic, condensed=condensed):
        if not candidate:
            continue
        font = _load_font_cached(candidate, size)
        if font is not None:
            return font
    try:
        font = _load_font_cached("arial.ttf", size)
        if font is not None:
            return font
    except Exception:
        pass
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


def _font_metrics(draw, font):
    bbox = draw.textbbox((0, 0), "Ay", font=font)
    height = bbox[3] - bbox[1]
    if hasattr(font, "getmetrics"):
        asc, desc = font.getmetrics()
        height = max(height, int((asc + desc) * 0.78))
    return max(1, height)


def _median_float(values):
    values = sorted(float(v) for v in values if v is not None)
    if not values:
        return None
    mid = len(values) // 2
    if len(values) % 2:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2.0


def _source_line_spacing_ratio(region):
    lines = (region or {}).get("source_lines") or []
    boxes = []
    for line in lines:
        raw_box = line.get("box") if isinstance(line, dict) else None
        if not raw_box or len(raw_box) < 4:
            continue
        try:
            y1 = float(raw_box[1])
            y2 = float(raw_box[3])
        except (TypeError, ValueError):
            continue
        if y2 <= y1:
            continue
        boxes.append((y1, y2))

    if len(boxes) < 2:
        return None

    boxes.sort(key=lambda item: item[0])
    centers = [(y1 + y2) / 2.0 for y1, y2 in boxes]
    advances = [
        centers[idx + 1] - centers[idx]
        for idx in range(len(centers) - 1)
        if centers[idx + 1] > centers[idx]
    ]
    glyph_heights = [y2 - y1 for y1, y2 in boxes]
    advance = _median_float(advances)
    glyph_height = _median_float(glyph_heights)
    if not advance or not glyph_height:
        return None
    return max(1.08, min(2.8, advance / max(1.0, glyph_height)))


def _looks_like_ui_list_item(region, image_width):
    if not region or region.get("layout_type") == "paragraph":
        return False
    text = str(region.get("detector_text", "")).strip()
    if not text:
        return False
    words = re.findall(r"[A-Za-z]+", text)
    if len(words) > 6 or len(text) > 58:
        return False
    x1, y1, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    if box_h > 34 or box_w > max(1.0, image_width) * 0.72:
        return False
    return bool(_glossary_translate(text)) or x1 <= max(96.0, image_width * 0.34)


def _paragraph_spacing_candidates(line_spacing):
    base = max(1.08, float(line_spacing or 1.18))
    raw_values = [
        base,
        base * 0.92,
        base * 0.84,
        base * 0.76,
        1.56,
        1.42,
        1.28,
        1.18,
        1.12,
    ]
    candidates = []
    for value in raw_values:
        value = round(max(1.05, min(2.8, value)), 3)
        if value not in candidates:
            candidates.append(value)
    return candidates


def _fit_single_line_font(draw, text, box_width, box_height, font_path,
                          min_size=6, max_size=72, h_pad=4, v_pad=2,
                          bold=False, italic=False, condensed=False,
                          line_spacing=1.08):
    line_text = " ".join(str(text).split())
    max_text_w = max(1, box_width - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)
    for size in range(max_size, min_size - 1, -1):
        font = _load_font(font_path, size, bold=bold, italic=italic, condensed=condensed)
        line_h = max(1, int(_font_metrics(draw, font) * line_spacing))
        if line_h > max_text_h:
            continue
        if _text_size(draw, line_text, font)[0] <= max_text_w:
            return font, [line_text], line_h
    return None


def _fit_font_and_wrap(draw, text, box_width, box_height, font_path,
                       min_size=8, max_size=72, h_pad=4, v_pad=2,
                       bold=False, italic=False, condensed=False,
                       line_spacing=1.08, prefer_single_line=False):
    max_text_w = max(1, box_width  - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)

    if prefer_single_line:
        single = _fit_single_line_font(
            draw,
            text,
            box_width,
            box_height,
            font_path,
            min_size=min_size,
            max_size=max_size,
            h_pad=h_pad,
            v_pad=v_pad,
            bold=bold,
            italic=italic,
            condensed=condensed,
            line_spacing=line_spacing,
        )
        if single is not None:
            return single
        font = _load_font(font_path, min_size, bold=bold, italic=italic, condensed=condensed)
        line_h = max(1, int(_font_metrics(draw, font) * line_spacing))
        return font, [" ".join(str(text).split())], line_h

    def _fits(size):
        font = _load_font(font_path, size, bold=bold, italic=italic, condensed=condensed)
        lines = _wrap_text(draw, text, font, max_text_w)
        line_h = int(_font_metrics(draw, font) * line_spacing)
        total_h = line_h * len(lines)
        widest  = max((_text_size(draw, ln, font)[0] for ln in lines), default=0)
        return widest <= max_text_w and total_h <= max_text_h, font, lines, line_h

    # Binary search: tìm size lớn nhất vừa khớp
    lo, hi = min_size, max_size
    best = None
    while lo <= hi:
        mid = (lo + hi) // 2
        ok, font, lines, line_h = _fits(mid)
        if ok:
            best = (mid, font, lines, line_h)
            lo = mid + 1          # thử lớn hơn
        else:
            hi = mid - 1          # thu nhỏ

    if best is not None:
        _, font, lines, line_h = best
        return font, lines, line_h

    # Fallback: min_size dù không vừa
    font = _load_font(font_path, min_size, bold=bold, italic=italic, condensed=condensed)
    lines = _wrap_text(draw, text, font, max_text_w)
    line_h = int(_font_metrics(draw, font) * line_spacing)
    return font, lines, line_h


def _fit_paragraph_font_and_wrap(draw, text, box_width, box_height, font_path,
                                 min_size=9, max_size=32, h_pad=4, v_pad=2,
                                 bold=False, italic=False, condensed=False,
                                 line_spacing=1.18):
    max_text_w = max(1, box_width - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)
    best = None

    target_fill = min(0.92, max(0.82, 0.72 + min(float(line_spacing or 1.18), 2.6) * 0.08))
    for size in range(max_size, min_size - 1, -1):
        font = _load_font(font_path, size, bold=bold, italic=italic, condensed=condensed)
        lines = _wrap_text(draw, text, font, max_text_w)
        for spacing in _paragraph_spacing_candidates(line_spacing):
            line_h = max(1, int(_font_metrics(draw, font) * spacing))
            total_h = line_h * len(lines)
            widest = max((_text_size(draw, line, font)[0] for line in lines), default=0)
            if widest <= max_text_w and total_h <= max_text_h:
                fill_ratio = total_h / max_text_h
                spacing_penalty = abs(spacing - float(line_spacing or 1.18)) * 0.035
                score = -abs(fill_ratio - target_fill) + (size * 0.003) - spacing_penalty
                if best is None or score > best[0]:
                    best = (score, font, lines, line_h, spacing)

    if best is not None:
        _, font, lines, line_h, spacing = best
        return font, lines, line_h, spacing

    font, lines, line_h = _fit_font_and_wrap(
        draw,
        text,
        box_width,
        box_height,
        font_path,
        min_size=min_size,
        max_size=max_size,
        h_pad=h_pad,
        v_pad=v_pad,
        bold=bold,
        italic=italic,
        condensed=condensed,
        line_spacing=line_spacing,
    )
    return font, lines, line_h, line_spacing


def _safe_box(box, width, height, pad=0):
    x1, y1, x2, y2 = [int(round(v)) for v in box]
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(width, x2 + pad)
    y2 = min(height, y2 + pad)
    return x1, y1, max(x1 + 1, x2), max(y1 + 1, y2)


def _source_text_mask(source_image, box):
    if source_image is None:
        return None
    x1, y1, x2, y2 = _safe_box(box, source_image.width, source_image.height)
    crop = np.asarray(source_image.crop((x1, y1, x2, y2)).convert("RGB"), dtype=np.float32)
    if crop.size == 0:
        return None

    h, w = crop.shape[:2]
    if float(np.max(crop) - np.min(crop)) < 6.0:
        return None
    edge = max(1, min(h, w) // 8)
    border = np.concatenate([
        crop[:edge, :, :].reshape(-1, 3),
        crop[-edge:, :, :].reshape(-1, 3),
        crop[:, :edge, :].reshape(-1, 3),
        crop[:, -edge:, :].reshape(-1, 3),
    ], axis=0)
    bg = np.median(border, axis=0)
    diff = np.linalg.norm(crop - bg, axis=2)
    threshold = max(16.0, float(np.percentile(diff, 72)))
    mask = diff >= threshold

    min_pixels = max(8, int(h * w * 0.012))
    if int(mask.sum()) < min_pixels:
        gray = np.dot(crop[..., :3], [0.299, 0.587, 0.114])
        bg_lum = float(_luminance(tuple(bg.tolist())))
        if bg_lum > 130:
            mask = gray <= np.percentile(gray, 24)
        else:
            mask = gray >= np.percentile(gray, 76)

    if int(mask.sum()) < min_pixels:
        return None
    return mask


def _render_source_text_mask(text, width, height, font, align, h_pad, v_pad, line_spacing, stroke_width=0):
    mask_img = Image.new("L", (max(1, width), max(1, height)), 0)
    draw = ImageDraw.Draw(mask_img)
    max_text_w = max(1, width - 2 * h_pad)
    lines = _wrap_text(draw, text, font, max_text_w)
    line_h = max(1, int(_font_metrics(draw, font) * line_spacing))
    total_h = line_h * len(lines)
    y = max(v_pad, (height - total_h) // 2)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
        tw = bbox[2] - bbox[0]
        if align == "left":
            x = h_pad
        else:
            x = max(h_pad, (width - tw) // 2)
        draw.text(
            (x - bbox[0], y - bbox[1]),
            line,
            font=font,
            fill=255,
            stroke_width=stroke_width,
            stroke_fill=255,
        )
        y += line_h
    return np.asarray(mask_img) > 18


def _font_match_candidates(font_path, bold=False, italic=False, condensed=False, limit=32):
    def matches_variant(candidate):
        name = Path(candidate).name.lower()
        is_bold_name = any(mark in name for mark in (
            "bold", "semibold", "semi", "demi", "medium", "black", "heavy",
            "extrabold", "arialbd", "arialbi", "-bd",
        ))
        is_italic_name = any(mark in name for mark in ("italic", "oblique", "ariali", "arialbi"))
        is_condensed_name = "condensed" in name
        if not bold and is_bold_name:
            return False
        if not italic and is_italic_name:
            return False
        if not condensed and is_condensed_name:
            return False
        return True

    seen = set()
    candidates = []
    for candidate in _font_variant_candidates(font_path or "", bold=bold, italic=italic, condensed=condensed):
        if not candidate or candidate in seen or not matches_variant(candidate):
            continue
        seen.add(candidate)
        candidates.append(candidate)
        if len(candidates) >= limit:
            break
    return candidates


@lru_cache(maxsize=2048)
def _load_font_exact(candidate: str, size: int):
    try:
        return ImageFont.truetype(candidate, size, encoding="utf-8")
    except (OSError, IOError):
        return None


def _font_match_sample(region, box):
    if not region:
        return str(region.get("detector_text", "")) if region else "", box
    lines = region.get("source_lines") or []
    usable_lines = [line for line in lines if line.get("text") and line.get("box")]
    if usable_lines:
        line = max(usable_lines, key=lambda item: len(item["text"]))
        return line["text"], line["box"]
    return str(region.get("detector_text", "")), box


def _match_source_font_style(source_image, region, box, base_style, font_path):
    if source_image is None or not region:
        return None

    source_text, sample_box = _font_match_sample(region, box)
    source_text = str(source_text or "").strip()
    if len(source_text) < 2:
        return None

    x1, y1, x2, y2 = _safe_box(sample_box, source_image.width, source_image.height)
    width, height = max(1, x2 - x1), max(1, y2 - y1)
    if width < 8 or height < 6:
        return None

    fg_mask = _source_text_mask(source_image, sample_box)
    if fg_mask is None:
        return None

    target_size = int(base_style.get("target_size", max(8, height * 0.85)))
    min_size = max(6, int(target_size * 0.58))
    max_size = min(96, max(min_size, int(target_size * 1.32), height + 10))
    if base_style.get("layout_type") == "paragraph":
        max_size = min(max_size, max(min_size, int(target_size * 1.12)))
    h_pad = max(1, int(width * 0.015))
    v_pad = max(0, int(height * 0.04))
    if base_style.get("layout_type") == "paragraph":
        align_options = ["left"]
    elif base_style.get("align") == "center":
        align_options = ["center"]
    else:
        align_options = ["left", "center"] if width > height * 2.4 else [base_style.get("align", "center"), "center"]
    stroke_options = [0]
    if base_style.get("layout_type") == "paragraph":
        raw_variants = [
            (False, False, base_style.get("condensed", False)),
            (False, False, False),
            (True, False, False),
            (False, False, True),
            (True, False, True),
        ]
    else:
        raw_variants = [
            (base_style.get("bold", False), base_style.get("italic", False), base_style.get("condensed", False)),
            (False, False, False),
            (True, False, False),
            (False, True, False),
            (True, True, False),
            (False, False, True),
            (True, False, True),
        ]
    variant_options = []
    for variant in raw_variants:
        if variant not in variant_options:
            variant_options.append(variant)

    fg_area = int(fg_mask.sum())
    best = None
    best_score = -1.0
    measure_draw = ImageDraw.Draw(Image.new("RGB", (width, height), "white"))

    for bold, italic, condensed in variant_options:
        for candidate_path in _font_match_candidates(font_path, bold=bold, italic=italic, condensed=condensed):
            for size in range(max_size, min_size - 1, -2):
                font = _load_font_exact(candidate_path, size)
                if font is None:
                    continue
                if _text_size(measure_draw, source_text, font)[0] > width * 1.22 and " " not in source_text:
                    continue
                for align in align_options:
                    for stroke_width in stroke_options:
                        cand = _render_source_text_mask(
                            source_text,
                            width,
                            height,
                            font,
                            align,
                            h_pad,
                            v_pad,
                            base_style.get("line_spacing", 1.08),
                            stroke_width=stroke_width,
                        )
                        cand_area = int(cand.sum())
                        if cand_area == 0:
                            continue
                        intersection = int(np.logical_and(fg_mask, cand).sum())
                        union = int(np.logical_or(fg_mask, cand).sum())
                        iou = intersection / max(1, union)
                        coverage = intersection / max(1, fg_area)
                        density_penalty = abs(cand_area - fg_area) / max(1, fg_area)
                        score = (0.68 * iou) + (0.28 * coverage) - (0.10 * min(2.0, density_penalty))
                        if score > best_score:
                            best_score = score
                            best = {
                                "font_path": candidate_path,
                                "bold": bold,
                                "italic": italic,
                                "condensed": condensed,
                                "target_size": size,
                                "align": align,
                                "stroke_width": stroke_width,
                                "source_match_score": round(score, 4),
                            }

    if not best or best_score < 0.12:
        return None
    return best


def _expanded_render_box(box, width, height, paragraph=False):
    x1, y1, x2, y2 = [float(v) for v in box]
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    if paragraph:
        pad_right = min(max(6.0, box_w * 0.025), 18.0)
        pad_bottom = min(max(10.0, box_h * 0.12), 34.0)
        pad_top = min(max(2.0, box_h * 0.01), 5.0)
        return _safe_box((x1, y1 - pad_top, x2 + pad_right, y2 + pad_bottom), width, height)
    else:
        pad_x = min(max(2.0, box_w * 0.08), 14.0)
        pad_y = min(max(1.0, box_h * 0.12), 8.0)
    return _safe_box((x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y), width, height)


def _estimate_text_color(source_image, box):
    if source_image is None:
        return None

    x1, y1, x2, y2 = _safe_box(box, source_image.width, source_image.height)
    crop = np.asarray(source_image.crop((x1, y1, x2, y2)).convert("RGB"), dtype=np.float32)
    if crop.size == 0:
        return None

    h, w = crop.shape[:2]
    edge = max(1, min(h, w) // 8)
    border = np.concatenate([
        crop[:edge, :, :].reshape(-1, 3),
        crop[-edge:, :, :].reshape(-1, 3),
        crop[:, :edge, :].reshape(-1, 3),
        crop[:, -edge:, :].reshape(-1, 3),
    ], axis=0)
    bg = np.median(border, axis=0)
    diff = np.linalg.norm(crop - bg, axis=2)
    threshold = max(18.0, float(np.percentile(diff, 72)))
    fg = crop[diff >= threshold].reshape(-1, 3)

    if len(fg) < max(8, int(crop.reshape(-1, 3).shape[0] * 0.015)):
        gray = np.dot(crop[..., :3], [0.299, 0.587, 0.114])
        dark_limit = np.percentile(gray, 18)
        fg = crop[gray <= dark_limit].reshape(-1, 3)

    if len(fg) == 0:
        return None

    color = np.median(fg, axis=0)
    return tuple(int(max(0, min(255, v))) for v in color)


def _estimate_text_style(source_image, region, box, translated_text, font_path=RENDER_FONT_PATH):
    x1, y1, x2, y2 = [float(v) for v in box]
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    original_text = str(region.get("detector_text", "")) if region else ""
    word_count = len(re.findall(r"[A-Za-z]+", original_text))
    image_width = source_image.width if source_image is not None else max(1, box_w)
    region_line_count = int(region.get("line_count", 1)) if region else 1
    sentence_marks = len(re.findall(r"[.!?;:]", original_text))
    is_ui_list_item = _looks_like_ui_list_item(region, image_width)
    inferred_body = (
        bool(region and region.get("layout_type") == "paragraph")
        or region_line_count >= 3
        or word_count >= 24
        or len(original_text) >= 150
        or (word_count >= 16 and sentence_marks >= 2 and box_w >= image_width * 0.42)
    )
    is_paragraph = inferred_body
    match_source_font = _font_matching_enabled()
    readable_fixed_font = _readable_font_policy_enabled() and not match_source_font

    color = _estimate_text_color(source_image, box)
    if color is None:
        color = _adaptive_text_color(source_image, box) if source_image is not None else (0, 0, 0)

    if is_paragraph and source_image is not None:
        sx1, sy1, sx2, sy2 = _safe_box(box, source_image.width, source_image.height)
        bg_sample = np.asarray(source_image.crop((sx1, sy1, sx2, sy2)).convert("RGB"), dtype=np.float32)
        bg_luminance = _luminance(tuple(bg_sample.mean(axis=(0, 1)).tolist()[:3])) if bg_sample.size else 255
        if bg_luminance > 145 and _luminance(color) > 95:
            color = (56, 56, 56)

    luminance = _luminance(color)
    saturation = max(color) - min(color)
    is_heading = (not is_paragraph) and (not is_ui_list_item) and box_h >= 18 and len(original_text) <= 80 and word_count <= 8
    is_colored = saturation > 36 and luminance < 235
    bold = bool(is_heading or (is_colored and not is_paragraph))
    if is_ui_list_item:
        bold = False
    if is_paragraph:
        bold = False
    italic = bool((not is_ui_list_item) and ((len(original_text) > 45 and not is_heading and not is_paragraph and saturation < 45) or "/" in original_text))
    condensed = (not is_ui_list_item) and len(translated_text) > max(18, len(original_text) * 1.08)
    if readable_fixed_font:
        italic = False
        condensed = False

    if is_paragraph:
        if region_line_count >= 2:
            avg_line_h = float(region.get("avg_line_height", max(10, box_h / max(1, region_line_count))))
        else:
            estimated_lines = max(2, min(14, int(round(max(len(original_text), len(translated_text)) / 42))))
            avg_line_h = box_h / estimated_lines
        target_size = int(max(10, min(30, avg_line_h * 1.08)))
    else:
        size_factor = 0.84 if is_ui_list_item else (0.9 if bold else 0.84)
        size_cap = 30 if is_ui_list_item else 82
        min_cap = 10 if is_ui_list_item else 8
        target_size = int(max(min_cap, min(size_cap, box_h * size_factor)))
    if (not is_ui_list_item) and len(translated_text) > len(original_text) * 1.25:
        target_size = int(target_size * (0.96 if is_ui_list_item else (0.98 if is_paragraph else 0.96)))

    centered_block = abs(((x1 + x2) / 2.0) - (image_width / 2.0)) <= max(24.0, image_width * 0.08)
    if is_paragraph or is_ui_list_item:
        align = "left"
    elif centered_block and (is_heading or word_count <= 10 or box_w <= image_width * 0.72):
        align = "center"
    elif len(original_text) < 95:
        align = "left"
    else:
        align = "center"
    h_pad = max(2 if is_paragraph else 1, int(box_w * (0.012 if is_paragraph else (0.012 if is_ui_list_item else (0.018 if align == "left" else 0.025)))))
    v_pad = max(8 if is_paragraph else 1, int(box_h * (0.028 if is_paragraph else (0.04 if is_ui_list_item else 0.08))))
    source_line_spacing = _source_line_spacing_ratio(region) if is_paragraph else None
    line_spacing = (source_line_spacing or 1.18) if is_paragraph else (1.08 if is_ui_list_item else (1.06 if is_heading else 1.18))
    stroke_width = 0

    style = {
        "color": color,
        "bold": bold,
        "italic": italic,
        "condensed": condensed,
        "target_size": max(7, target_size),
        "align": align,
        "h_pad": h_pad,
        "v_pad": v_pad,
        "line_spacing": line_spacing,
        "stroke_width": stroke_width,
        "layout_type": "paragraph" if is_paragraph else "line",
        "ui_list_item": is_ui_list_item,
    }
    if readable_fixed_font:
        style["font_policy"] = "readable_fixed"
        style["font_path"] = font_path
    if is_ui_list_item:
        style["max_size"] = style["target_size"]
        style["min_size"] = style["target_size"]
    matched_style = None
    if match_source_font and not is_ui_list_item:
        matched_style = _match_source_font_style(source_image, region, box, style, font_path)
    if matched_style:
        style.update(matched_style)
    return style


def _prepare_render_styles(source_image, regions, translated_texts, font_path):
    styles = []
    measure_img = Image.new("RGB", (8, 8), "white")
    draw = ImageDraw.Draw(measure_img)
    paragraph_indexes = []

    for idx, (region, text) in enumerate(zip(regions, translated_texts)):
        style = _estimate_text_style(source_image, region, region["box"], text, font_path)
        style = {
            **style,
            "text_layout": _build_text_layout(region["box"], source_image.width, source_image.height, style, region),
        }
        styles.append(style)
        original_text = str(region.get("detector_text", ""))
        if style.get("layout_type") == "paragraph":
            paragraph_indexes.append(idx)

    if paragraph_indexes:
        fit_sizes = []
        for idx in paragraph_indexes:
            region = regions[idx]
            text = translated_texts[idx]
            style = styles[idx]
            is_paragraph = style.get("layout_type") == "paragraph"
            ex1, ey1, ex2, ey2 = _expanded_render_box(
                region["box"],
                source_image.width,
                source_image.height,
                paragraph=is_paragraph,
            )
            box_w = max(1, int(ex2 - ex1))
            box_h = max(1, int(ey2 - ey1))
            render_font_path = style.get("font_path", font_path)
            font, _, _, fitted_spacing = _fit_paragraph_font_and_wrap(
                draw,
                text,
                box_w,
                box_h,
                render_font_path,
                min_size=max(9, int(style["target_size"] * 0.72)),
                max_size=style["target_size"],
                h_pad=style["h_pad"],
                v_pad=style["v_pad"],
                bold=style["bold"],
                italic=style["italic"],
                condensed=style["condensed"],
                line_spacing=style["line_spacing"],
            )
            styles[idx] = {**style, "line_spacing": fitted_spacing}
            fit_sizes.append(getattr(font, "size", style["target_size"]))

        if fit_sizes:
            common_size = max(7, min(fit_sizes))
            for idx in paragraph_indexes:
                styles[idx] = {
                    **styles[idx],
                    "target_size": common_size,
                    "max_size": common_size,
                }

    styles = harmonize_repeated_label_styles(
        styles,
        regions,
        translated_texts,
        (source_image.width, source_image.height),
    )
    return styles


def _draw_text_on_image(image, box, text, font_path, source_image=None, region=None,
                        style_override=None, _draw_cache: dict = None):
    """Vẽ text lên image. _draw_cache cho phép tái dùng ImageDraw giữa các lần gọi."""
    # Tái sử dụng ImageDraw nếu được truyền từ bên ngoài (tránh tạo mới mỗi lần)
    if _draw_cache is not None:
        draw = _draw_cache.get("draw")
        if draw is None or _draw_cache.get("image") is not image:
            draw = ImageDraw.Draw(image)
            _draw_cache["draw"] = draw
            _draw_cache["image"] = image
    else:
        draw = ImageDraw.Draw(image)

    style = style_override or _estimate_text_style(source_image or image, region or {}, box, text, font_path)
    is_paragraph = style.get("layout_type") == "paragraph"
    text_layout = _build_text_layout(box, image.width, image.height, style, region)
    style = {**style, "text_layout": text_layout}
    x1, y1, x2, y2 = text_layout["render_box"]
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    is_ui_list_item = bool(style.get("ui_list_item"))
    if is_paragraph:
        min_size = max(9, int(style["target_size"] * 0.72))
    elif is_ui_list_item:
        min_size = max(7, int(style.get("min_size", style["target_size"] * 0.86)))
    else:
        min_size = 5 if box_h < 24 else 6
    max_size = max(min_size, style.get("max_size", style["target_size"] + 2))
    render_font_path = style.get("font_path", font_path)
    if is_paragraph:
        font, lines, line_h, fitted_spacing = _fit_paragraph_font_and_wrap(
            draw, text, box_w, box_h, render_font_path,
            min_size=min_size,
            max_size=max_size,
            h_pad=style["h_pad"],
            v_pad=style["v_pad"],
            bold=style["bold"],
            italic=style["italic"],
            condensed=style["condensed"],
            line_spacing=style["line_spacing"],
        )
        style = {**style, "line_spacing": fitted_spacing}
    else:
        font, lines, line_h = _fit_font_and_wrap(
            draw, text, box_w, box_h, render_font_path,
            min_size=min_size,
            max_size=max_size,
            h_pad=style["h_pad"],
            v_pad=style["v_pad"],
            bold=style["bold"],
            italic=style["italic"],
            condensed=style["condensed"],
            line_spacing=style["line_spacing"],
            prefer_single_line=True,
        )
    text_color = style["color"]
    stroke_width = style["stroke_width"]
    stroke_color = (255, 255, 255) if _luminance(text_color) < 115 else (0, 0, 0)

    line_scale_x = 1.0
    if not is_paragraph and len(lines) == 1:
        max_line_w = _anchored_line_width(text_layout, box_w - 2 * style["h_pad"])
        natural_w = _text_size(draw, lines[0], font)[0]
        if natural_w > max_line_w:
            line_scale_x = max_line_w / max(1, natural_w)

    line_positions = _position_text_lines(
        draw, text_layout, lines, font, line_h,
        stroke_width=stroke_width,
        line_scale_x=line_scale_x,
    )

    for item in line_positions:
        line = item["text"]
        line_bbox = item["bbox"]
        w = item["width"]
        render_w = item["render_width"]
        x_start = item["x"]
        y_start = item["y"]
        if line_scale_x < 0.999:
            h = max(1, line_bbox[3] - line_bbox[1])
            layer = Image.new("RGBA", (max(1, w), h), (0, 0, 0, 0))
            layer_draw = ImageDraw.Draw(layer)
            layer_draw.text(
                (-line_bbox[0], -line_bbox[1]),
                line,
                fill=tuple(text_color[:3]) + (255,),
                font=font,
                stroke_width=stroke_width,
                stroke_fill=tuple(stroke_color[:3]) + (255,),
            )
            layer = layer.resize((render_w, h), Image.Resampling.LANCZOS)
            image.paste(layer, (int(round(x_start)), int(round(y_start))), layer)
        else:
            draw.text(
                (x_start - line_bbox[0], y_start - line_bbox[1]), line, fill=text_color, font=font,
                stroke_width=stroke_width, stroke_fill=stroke_color,
            )

    return image


# ═══════════════════════════════════════════════════════════════════════════════
# OpenCV Inpainting
# ═══════════════════════════════════════════════════════════════════════════════

def _create_text_mask(image_shape, regions):
    h, w = image_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for region in regions:
        region_mask = np.zeros((h, w), dtype=np.uint8)
        polygons = region.get("mask_polygons") or [region["polygon"]]
        for raw_polygon in polygons:
            polygon = np.array(raw_polygon, dtype=np.int32)
            cv2.fillPoly(region_mask, [polygon], 255)

        avg_h = float(region.get("avg_line_height", 0) or 0)
        if avg_h <= 0:
            x1, y1, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
            avg_h = max(1.0, y2 - y1)
        is_paragraph = region.get("layout_type") == "paragraph"
        if avg_h < 18:
            k, iterations = (3 if is_paragraph else 2), 1
        elif avg_h < 44:
            k, iterations = 3, 1
        else:
            k = 3 if is_paragraph else 5
            iterations = 1
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        region_mask = cv2.dilate(region_mask, kernel, iterations=iterations)
        mask = cv2.max(mask, region_mask)
    return mask


def _inpaint_radius_for_regions(regions):
    heights = []
    has_paragraph = False
    for region in regions or []:
        has_paragraph = has_paragraph or region.get("layout_type") == "paragraph"
        avg_h = float(region.get("avg_line_height", 0) or 0)
        if avg_h <= 0:
            x1, y1, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
            avg_h = max(1.0, y2 - y1)
        heights.append(avg_h)
    median_h = _median_float(heights) or 24.0
    if has_paragraph:
        return 3 if median_h < 42 else 4
    if median_h < 18:
        return 2
    if median_h < 42:
        return 3
    return 4 if has_paragraph else 5


def _mask_bbox(mask, pad=0):
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return None
    h, w = mask.shape[:2]
    x1 = max(0, int(xs.min()) - pad)
    y1 = max(0, int(ys.min()) - pad)
    x2 = min(w, int(xs.max()) + pad + 1)
    y2 = min(h, int(ys.max()) + pad + 1)
    return x1, y1, x2, y2


def _fill_uniform_text_background(image_np, region_mask):
    bbox = _mask_bbox(region_mask, pad=10)
    if bbox is None:
        return False
    x1, y1, x2, y2 = bbox
    crop = image_np[y1:y2, x1:x2].astype(np.float32)
    mask_crop = region_mask[y1:y2, x1:x2] > 0
    if crop.size == 0 or int(mask_crop.sum()) == 0:
        return False

    avoid = cv2.dilate(mask_crop.astype(np.uint8), np.ones((5, 5), dtype=np.uint8), iterations=1) > 0
    bg_pixels = crop[~avoid]
    if len(bg_pixels) < 40:
        bg_pixels = crop[~mask_crop]
    if len(bg_pixels) < 40:
        return False

    bg_color = np.median(bg_pixels, axis=0)
    distances = np.linalg.norm(bg_pixels - bg_color, axis=1)
    if float(np.percentile(distances, 85)) > 28.0:
        return False

    alpha = cv2.GaussianBlur((mask_crop.astype(np.float32) * 255.0), (3, 3), 0) / 255.0
    alpha[mask_crop] = 1.0
    crop[:] = crop * (1.0 - alpha[..., None]) + bg_color[None, None, :] * alpha[..., None]
    image_np[y1:y2, x1:x2] = np.clip(crop, 0, 255).astype(image_np.dtype)
    return True


def _inpaint_text(image_np, mask, regions=None):
    if mask.max() == 0:
        return image_np
    cleaned = image_np.copy()
    remaining_mask = mask.copy()
    for region in regions or []:
        region_mask = _create_text_mask(image_np.shape, [region])
        if _fill_uniform_text_background(cleaned, region_mask):
            remaining_mask[region_mask > 0] = 0
    if remaining_mask.max() == 0:
        return cleaned
    return cv2.inpaint(
        cleaned,
        remaining_mask,
        inpaintRadius=_inpaint_radius_for_regions(regions),
        flags=cv2.INPAINT_TELEA,
    )

# ─────────────────────────────────────────────────────────────────────────────
# Proper-noun detection — 3-tier system (no extra pip deps)
# ─────────────────────────────────────────────────────────────────────────────

# Tầng 1: Blocklist — các từ tiếng Anh thông thường mà NLLB hay giữ nguyên
# Nếu toàn bộ văn bản là các từ này → KHÔNG phải tên riêng
_EN_FUNCTION_WORDS: frozenset = frozenset({
    # Prepositions
    "a", "an", "the",
    "in", "on", "at", "by", "for", "with", "about", "against",
    "between", "into", "through", "before", "after", "above", "below",
    "to", "from", "up", "down", "of", "off", "over", "under", "around",
    "out", "near", "past", "since", "within", "without", "across",
    "along", "beside", "behind", "beyond", "inside", "outside", "upon",
    "next", "front", "back", "close", "opposite", "toward", "towards",
    # Conjunctions
    "and", "but", "or", "nor", "so", "yet", "both", "either", "neither",
    "although", "because", "since", "unless", "while", "whereas",
    # Auxiliary verbs
    "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    "will", "would", "shall", "should", "may", "might", "must",
    "can", "could", "need", "dare", "ought",
    # Pronouns
    "i", "you", "he", "she", "it", "we", "they",
    "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their",
    "this", "that", "these", "those", "who", "which", "what",
    # Common adverbs / adjectives
    "not", "no", "all", "each", "every", "some", "any", "few",
    "more", "most", "other", "such", "own", "same",
    "then", "than", "also", "just", "only", "even", "still",
    "very", "quite", "rather", "too", "enough",
    # Numbers (as words)
    "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "zero",
    # Common descriptive / position words (thường xuất hiện trong ảnh giáo dục)
    "top", "bottom", "left", "right", "middle", "center", "side",
    "here", "there", "now", "then", "always", "never",
})

# NER pipeline — lazy singleton (chỉ load lần đầu, dùng lại sau)
_ner_pipeline = None
_ner_lock = None
_NER_GROUPS = {"PER", "ORG", "LOC", "MISC"}
_NER_PLACEHOLDER_RE = re.compile(r"NERENTITY(\d+)TOKEN", re.IGNORECASE)
_COMMON_NON_ENTITY_WORDS: frozenset = frozenset({
    "about", "activity", "answer", "answers", "book", "chapter", "class",
    "course", "day", "dialogue", "exercise", "family", "father", "friend",
    "friends", "grammar", "home", "lesson", "listening", "mother", "name",
    "paragraph", "practice", "question", "questions", "reading", "school",
    "sentence", "sentences", "speaking", "student", "teacher", "text",
    "title", "topic", "unit", "vocabulary", "word", "words", "workbook",
    "writing",
    "age", "air", "animal", "apple", "area", "art", "baby", "back", "ball",
    "bank", "beautiful", "best", "birthday", "body", "boy", "brother",
    "bus", "business", "car", "card", "care", "cat", "child", "children",
    "city", "color", "country", "daily", "daughter", "dog", "door", "dream",
    "drink", "earth", "education", "english", "evening", "example", "face",
    "fact", "food", "football", "game", "girl", "good", "group", "happy",
    "health", "hello", "history", "house", "idea", "image", "important",
    "job", "kind", "language", "life", "line", "love", "man", "map", "market",
    "meaning", "money", "month", "morning", "movie", "music", "number",
    "page", "paper", "parent", "part", "people", "person", "picture", "place",
    "plan", "point", "read", "real", "room", "science", "sister", "son",
    "song", "story", "street", "study", "test", "thing", "time", "today",
    "travel", "tree", "true", "video", "water", "way", "week", "welcome",
    "woman", "world", "year",
    "beautiful", "become", "becoming", "benefit", "benefits", "choice",
    "choices", "congestion", "danger", "develop", "developing", "different",
    "enter", "especially", "focus", "give", "heart", "litter", "littering",
    "live", "living", "never", "only", "pollution", "positive", "public",
    "quote", "smile", "traffic", "transport", "transportation", "unique",
})
_ENTITY_SUFFIX_WORDS: frozenset = frozenset({
    "academy", "airlines", "bank", "club", "college", "company", "corp",
    "corporation", "foundation", "group", "inc", "institute", "labs", "ltd",
    "media", "school", "studio", "university",
})
_ENTITY_CONNECTOR_WORDS: frozenset = frozenset({
    "of", "the", "and", "de", "da", "del", "di", "du", "la", "le", "van", "von",
})
_KNOWN_ENTITY_WORDS: frozenset = frozenset({
    "adidas", "amazon", "apple", "facebook", "google", "langmaster",
    "microsoft", "netflix", "nike", "openai", "samsung", "tesla", "youtube",
    "zenlish",
    "anna", "david", "john", "lily", "linda", "mary", "michael", "peter",
    "sarah", "tom",
})


def _get_ner_pipeline():
    """
    Lazy-load NER pipeline (dslim/bert-base-NER, ~400MB).
    Chỉ chạy CPU, không cần GPU riêng — model nhỏ, inference < 50ms/text.
    """
    global _ner_pipeline, _ner_lock
    import threading
    if _ner_lock is None:
        _ner_lock = threading.Lock()
    with _ner_lock:
        if _ner_pipeline is None:
            try:
                from transformers import pipeline as hf_pipeline
                _ner_pipeline = hf_pipeline(
                    "ner",
                    model="dslim/bert-base-NER",
                    aggregation_strategy="simple",
                    device=-1,          # CPU
                )
                print("[NER] Loaded dslim/bert-base-NER for proper-noun detection")
            except Exception as e:
                print(f"[NER] Failed to load NER model: {e} — falling back to heuristic")
                _ner_pipeline = "unavailable"
    return _ner_pipeline if _ner_pipeline != "unavailable" else None


def _word_key(token: str) -> str:
    return re.sub(r"[^A-Za-z]", "", token).lower()


@lru_cache(maxsize=4096)
def _english_zipf_frequency(word: str) -> float:
    if not word:
        return 0.0
    try:
        from wordfreq import zipf_frequency
        return float(zipf_frequency(word, "en"))
    except Exception:
        return 0.0


def _is_probably_english_dictionary_word(token: str) -> bool:
    key = _word_key(token)
    if len(key) < 3 or key in _KNOWN_ENTITY_WORDS:
        return False
    return _english_zipf_frequency(key) >= 2.6


def _is_common_meaningful_word(token: str) -> bool:
    key = _word_key(token)
    if key in _KNOWN_ENTITY_WORDS:
        return False
    return bool(key) and (
        key in _EN_FUNCTION_WORDS
        or key in _COMMON_NON_ENTITY_WORDS
        or _is_probably_english_dictionary_word(token)
    )


def _looks_like_strong_entity_token(token: str) -> bool:
    letters = re.sub(r"[^A-Za-z]", "", token)
    if len(letters) < 2:
        return False
    lower = letters.lower()
    if _is_common_meaningful_word(token):
        return False
    if lower in _KNOWN_ENTITY_WORDS:
        return True
    if letters.isupper() and 2 <= len(letters) <= 5:
        return True
    return any(c.isupper() for c in letters[1:])


def _looks_like_weak_entity_token(token: str) -> bool:
    letters = re.sub(r"[^A-Za-z]", "", token)
    if _is_common_meaningful_word(token):
        return False
    return len(letters) >= 2 and letters[0].isupper() and letters[1:].islower()


def _heuristic_entity_spans(text: str) -> list[dict]:
    tokens = list(re.finditer(r"[A-Za-z][A-Za-z0-9&.'-]*", text))
    spans: list[dict] = []
    group: list[re.Match] = []
    has_strong = False
    has_nameish = False
    has_suffix = False

    def flush():
        nonlocal group, has_strong, has_nameish, has_suffix
        if not group:
            return
        proper_tokens = [
            m for m in group
            if _word_key(m.group(0)) not in _EN_FUNCTION_WORDS
            and _word_key(m.group(0)) not in _ENTITY_CONNECTOR_WORDS
        ]
        unknown_tokens = [
            m for m in proper_tokens
            if not _is_common_meaningful_word(m.group(0))
        ]
        is_entity = (
            has_strong
            or has_suffix
            or len(unknown_tokens) >= 2
            or (
                len(unknown_tokens) == 1
                and _word_key(unknown_tokens[0].group(0)) in _KNOWN_ENTITY_WORDS
            )
        )
        if is_entity:
            spans.append({
                "start": group[0].start(),
                "end": group[-1].end(),
                "word": text[group[0].start():group[-1].end()],
                "entity_group": "MISC",
                "score": 0.74 if (has_strong or has_suffix) else 0.62,
                "source": "heuristic",
            })
        group = []
        has_strong = False
        has_nameish = False
        has_suffix = False

    for match in tokens:
        token = match.group(0)
        lower = _word_key(token)
        strong = _looks_like_strong_entity_token(token)
        weak = _looks_like_weak_entity_token(token)
        connector = lower in _ENTITY_CONNECTOR_WORDS and bool(group)
        suffix = lower in _ENTITY_SUFFIX_WORDS and bool(group)

        if strong or weak or connector or suffix:
            group.append(match)
            has_strong = has_strong or strong
            has_nameish = has_nameish or weak
            has_suffix = has_suffix or suffix
        else:
            flush()

    flush()
    return spans


def _dedupe_entity_spans(entities: list[dict]) -> list[dict]:
    cleaned = []
    for ent in sorted(entities, key=lambda e: (int(e["start"]), -int(e["end"]))):
        start = int(ent["start"])
        end = int(ent["end"])
        if end <= start:
            continue
        if cleaned and start < cleaned[-1]["end"]:
            previous = cleaned[-1]
            prev_len = previous["end"] - previous["start"]
            curr_len = end - start
            if curr_len > prev_len or float(ent.get("score", 0)) > float(previous.get("score", 0)):
                cleaned[-1] = {**ent, "start": start, "end": end}
            continue
        cleaned.append({**ent, "start": start, "end": end})
    return cleaned


def _is_translatable_entity_span(text: str, start: int, end: int) -> bool:
    span = text[start:end].strip()
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9&.'-]*", span)
    if not tokens:
        return True

    keys = [_word_key(token) for token in tokens]
    if all(_is_common_meaningful_word(token) for token in tokens):
        return True

    if len(tokens) == 1:
        key = keys[0]
        token = tokens[0]
        if key in _KNOWN_ENTITY_WORDS:
            return False
        if key in _COMMON_NON_ENTITY_WORDS or key in _EN_FUNCTION_WORDS:
            return True
        letters = re.sub(r"[^A-Za-z]", "", token)
        if letters.isupper() and len(letters) > 5:
            return True

    return False


def _extract_named_entities(text: str) -> list[dict]:
    if _tier1_all_function_words(text):
        return []

    entities: list[dict] = []
    ner = _get_ner_pipeline()
    if ner is not None:
        try:
            for ent in ner(text):
                if ent.get("entity_group") not in _NER_GROUPS:
                    continue
                if float(ent.get("score", 0)) < 0.80:
                    continue
                start = ent.get("start")
                end = ent.get("end")
                if start is None or end is None:
                    continue
                if _is_translatable_entity_span(text, int(start), int(end)):
                    continue
                entities.append({
                    "start": int(start),
                    "end": int(end),
                    "word": text[int(start):int(end)],
                    "entity_group": ent.get("entity_group"),
                    "score": float(ent.get("score", 0)),
                    "source": "bert",
                })
        except Exception:
            entities = []

    entities.extend(_heuristic_entity_spans(text))
    return _dedupe_entity_spans(entities)


def _entity_char_coverage(text: str, entities: list[dict]) -> float:
    alpha_positions = {idx for idx, ch in enumerate(text) if ch.isalnum()}
    if not alpha_positions:
        return 0.0
    entity_positions = set()
    for ent in entities:
        entity_positions.update(
            idx for idx in range(ent["start"], ent["end"])
            if idx in alpha_positions
        )
    return len(entity_positions) / max(1, len(alpha_positions))


def _is_entity_only_text(text: str, entities: list[dict] | None = None) -> bool:
    entities = entities if entities is not None else _extract_named_entities(text)
    if not entities:
        return False
    return _entity_char_coverage(text, entities) >= 0.72


def _protect_named_entities(text: str) -> tuple[str, list[dict]]:
    entities = _extract_named_entities(text)
    if not entities:
        return text, []

    protected = []
    cursor = 0
    protected_entities = []
    for idx, ent in enumerate(entities):
        start = ent["start"]
        end = ent["end"]
        placeholder = f"NERENTITY{idx}TOKEN"
        protected.append(text[cursor:start])
        protected.append(placeholder)
        protected_entities.append({**ent, "placeholder": placeholder, "original": text[start:end]})
        cursor = end
    protected.append(text[cursor:])
    return "".join(protected), protected_entities


def _restore_named_entities(text: str, entities: list[dict]) -> str:
    restored = text
    for ent in entities:
        original = ent.get("original", ent.get("word", ""))
        placeholder = ent.get("placeholder", "")
        if placeholder:
            restored = re.sub(re.escape(placeholder), original, restored, flags=re.IGNORECASE)

    def replace_match(match):
        idx = int(match.group(1))
        if 0 <= idx < len(entities):
            return entities[idx].get("original", entities[idx].get("word", match.group(0)))
        return match.group(0)

    return _NER_PLACEHOLDER_RE.sub(replace_match, restored)


def _should_keep_original_region(en_text: str, vi_text: str, entities: list[dict] | None = None) -> bool:
    if _has_ui_translation_path(en_text):
        return False
    if _is_entity_only_text(en_text, entities):
        return True
    return _is_untranslated(en_text, vi_text)


def _tier1_all_function_words(text: str) -> bool:
    """Tầng 1: True nếu TẤT CẢ từ trong text đều là function word → không phải tên riêng."""
    words = re.findall(r"[A-Za-z]+", text)
    if not words:
        return True
    return all(w.lower() in _EN_FUNCTION_WORDS for w in words)


def _tier2_heuristic_proper(text: str) -> bool:
    """
    Tầng 2: Heuristic nhanh nhận diện tên riêng dựa trên pattern chữ viết.
    True nếu phát hiện pattern tên riêng.
    """
    words = re.findall(r"[A-Za-z]+", text)
    if not words:
        return False

    for word in words:
        if word.lower() in _EN_FUNCTION_WORDS:
            continue
        # ALL-CAPS dài ≥ 2: viết tắt / thương hiệu (NASA, EU, HBO, NBA…)
        if len(word) >= 2 and word.isupper():
            return True
        # TitleCase không phải đầu câu (đã loại function word ở trên)
        if word[0].isupper() and len(word) >= 2:
            return True
        # CamelCase: iPhone, YouTube, PlayStation
        if any(c.isupper() for c in word[1:]):
            return True

    return False


def _tier3_ner_proper(text: str) -> bool:
    """
    Tầng 3: Dùng BERT NER pipeline để xác nhận có named entity không.
    Chỉ gọi khi tầng 1+2 không kết luận được.
    Entity types: PER (person), ORG, LOC, MISC → đều là tên riêng.
    """
    ner = _get_ner_pipeline()
    if ner is None:
        return False
    try:
        entities = ner(text)
        return any(
            e["entity_group"] in ("PER", "ORG", "LOC", "MISC")
            and e["score"] >= 0.80
            for e in entities
        )
    except Exception:
        return False


def _is_proper_noun(text: str) -> bool:
    """
    Kiểm tra xem text có phải tên riêng không, dùng pipeline 3 tầng:
      Tầng 1 — Blocklist function words (reject ngay, không tốn compute)
      Tầng 2 — Heuristic pattern chữ viết (fast, ~0ms)
      Tầng 3 — BERT NER (authoritative, ~30-50ms, chỉ khi cần)
    """
    # Tầng 1: toàn function word → chắc chắn không phải tên riêng
    if _tier1_all_function_words(text):
        return False

    # Tầng 2: heuristic nhanh
    if _tier2_heuristic_proper(text):
        # Xác nhận lại bằng NER nếu model available
        ner = _get_ner_pipeline()
        if ner is not None:
            return _tier3_ner_proper(text)
        return True  # heuristic đủ tốt nếu NER không có

    # Tầng 2 không kết luận được → hỏi NER
    return _tier3_ner_proper(text)


def _is_untranslated(en_text: str, vi_text: str) -> bool:
    """
    Trả về True nếu NLLB giữ nguyên text vì đây là tên riêng thực sự.

    Pipeline:
      1. Chuẩn hoá + so sánh: nếu dịch ≠ gốc → rõ ràng đã dịch → False
      2. Nếu bằng nhau → kiểm tra _is_proper_noun(en_text):
         - True  → là tên riêng, hợp lý khi giữ nguyên → return True
         - False → là từ thông thường (giới từ, v.v.) mà NLLB thiếu context
                   → coi như "chưa dịch đúng", return False để re-render
    """
    def _norm(s: str) -> str:
        return re.sub(r"[\s\-_.,!?'\"]+", " ", s.strip()).lower().strip()

    if _norm(en_text) != _norm(vi_text):
        return False

    return _is_proper_noun(en_text)


def _restore_original_region(target_pil: "Image.Image", source_pil: "Image.Image", box):
    """Dán lại pixel gốc từ source_pil vào target_pil ở vùng box."""
    x1 = max(0, int(round(box[0])))
    y1 = max(0, int(round(box[1])))
    x2 = min(source_pil.width,  int(round(box[2])))
    y2 = min(source_pil.height, int(round(box[3])))
    if x2 <= x1 or y2 <= y1:
        return
    original_crop = source_pil.crop((x1, y1, x2, y2))
    target_pil.paste(original_crop, (x1, y1))


# Canonical helper implementations live in small modules.  The names are kept
# here for backward compatibility with the existing pipeline code below.
from vietrans_space_inference.font_utils import (  # noqa: E402
    FONT_SEARCH_PATHS,
    _find_system_font,
    _font_metrics,
    _font_matching_enabled,
    _font_variant_candidates,
    _load_font,
    _median_float,
    _readable_font_policy_enabled,
    _system_font_files,
    _text_size,
    _wrap_text,
)
from vietrans_space_inference.layout_position import (  # noqa: E402
    _anchored_line_width,
    _build_text_layout,
    _expanded_render_box,
    _position_text_lines,
)
from vietrans_space_inference.model_loader import (  # noqa: E402
    load_nllb_model,
    load_paddleocr_engine,
)
from vietrans_space_inference.qa import (  # noqa: E402
    build_leftover_english_qa,
    write_qa_report,
)
from vietrans_space_inference.sizing import (  # noqa: E402
    _fit_font_and_wrap,
    _fit_paragraph_font_and_wrap,
    _fit_single_line_font,
    _looks_like_ui_list_item,
    _paragraph_spacing_candidates,
    _source_line_spacing_ratio,
)
from vietrans_space_inference.style_harmonization import harmonize_repeated_label_styles  # noqa: E402
from vietrans_space_inference.text_processing import (  # noqa: E402
    LATIN_WORD_RE,
    STRONG_VIETNAMESE_WORDS,
    UI_ALLOWED_UNTRANSLATED_TOKENS,
    UI_CONNECTOR_TRANSLATIONS,
    UI_KEEP_AS_IS,
    UI_PHRASE_TRANSLATIONS,
    UI_TRANSLATION_GLOSSARY,
    UI_WORD_TRANSLATIONS,
    VIETNAMESE_MARK_RE,
    VIETNAMESE_WORDS,
    _can_merge_lines,
    _capitalize_vi_label,
    _glossary_translate,
    _group_paragraph_regions,
    _has_ui_translation_path,
    _has_unaccented_vietnamese_words,
    _is_body_text_line,
    _is_nontranslatable_ui_token,
    _is_probably_phonetic,
    _is_rotated_decorative_region,
    _latin_token_set,
    _looks_like_domain_or_handle,
    _merge_region_group,
    _polygon_horizontal_angle,
    _rect_polygon,
    _repair_translation_if_needed,
    _should_translate_region,
    _split_trailing_ui_suffix,
    _translate_ui_key_by_terms,
    _translation_needs_repair,
    _ui_text_key,
)




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
        self.ocr_engine = load_paddleocr_engine()
        print("[Pipeline] PaddleOCR PP-OCRv5 loaded.")

        # ── 2. NLLB-200 1.3B fine-tuned ──────────────────────────────────────
        print(f"[Pipeline] Loading NLLB từ: {NLLB_MODEL_PATH}")
        self.nllb_tokenizer, self.nllb_model = load_nllb_model(
            NLLB_MODEL_PATH,
            NLLB_SRC_LANG,
            self.device,
        )

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

        direct = [_glossary_translate(text) for text in texts]
        model_indexes = [idx for idx, value in enumerate(direct) if value is None]
        results = [value if value is not None else "" for value in direct]
        if not model_indexes:
            return results

        model_texts = [texts[idx] for idx in model_indexes]
        protected_items = [_protect_named_entities(text) for text in model_texts]
        protected_texts = [item[0] for item in protected_items]
        entity_maps     = [item[1] for item in protected_items]

        translations = []
        batch_size   = 4

        for i in range(0, len(protected_texts), batch_size):
            batch  = protected_texts[i : i + batch_size]
            inputs = self.nllb_tokenizer(
                batch,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=384,
            ).to(self.device)

            with torch.no_grad():
                tgt_lang_id = self.nllb_tokenizer.convert_tokens_to_ids(NLLB_TGT_LANG)
                generated   = self.nllb_model.generate(
                    **inputs,
                    forced_bos_token_id=tgt_lang_id,
                    max_new_tokens=384,
                    num_beams=5,
                    early_stopping=True,
                )
            decoded = self.nllb_tokenizer.batch_decode(generated, skip_special_tokens=True)
            translations.extend(decoded)

        restored = []
        for source, translated, entities in zip(model_texts, translations, entity_maps):
            candidate = _restore_named_entities(translated, entities)
            repaired = _repair_translation_if_needed(source, candidate)
            if repaired != candidate or not _is_entity_only_text(source, entities):
                restored.append(repaired)
            else:
                restored.append(source)
        for idx, translated in zip(model_indexes, restored):
            results[idx] = translated
        return results

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
        ocr_path     = os.path.join(output_dir, "ocr.txt")
        qa_path      = os.path.join(output_dir, "qa.json")

        original_pil = Image.open(input_img_path).convert("RGB")
        original_np  = np.array(original_pil)

        # ─── Stage 1: OCR ────────────────────────────────────────────────────
        print("[Pipeline] Stage 1: OCR…")
        regions = self._run_ocr(input_img_path)
        # Pre-compute translatability một lần duy nhất
        image_size = original_pil.size
        translatable_flags = {id(r): _should_translate_region(r, image_size) for r in regions}
        translatable_regions = _group_paragraph_regions(
            [r for r in regions if translatable_flags[id(r)]],
            original_pil.width,
        )
        en_texts = [r["detector_text"] for r in translatable_regions]
        ocr_text = "\n".join(
            str(region.get("detector_text", "")).strip()
            for region in regions
            if str(region.get("detector_text", "")).strip()
        )
        with open(ocr_path, "w", encoding="utf-8") as f:
            f.write(ocr_text)
        print(f"[Pipeline]   Phát hiện {len(regions)} vùng chữ, gom thành {len(translatable_regions)} block cần dịch")

        # Lưu text_en.jpg — tái dùng font size=12 (đã cache)
        text_en_img = original_pil.copy()
        draw_en     = ImageDraw.Draw(text_en_img)
        font_sm = _load_font(self.font_path, 12)   # load 1 lần, cache sẽ trả lại cùng object
        for region in regions:
            polygon = [(int(p[0]), int(p[1])) for p in region["polygon"]]
            outline = (255, 0, 0) if translatable_flags[id(region)] else (130, 130, 130)
            draw_en.polygon(polygon, outline=outline, width=2)
            x1, y1 = int(region["box"][0]), int(region["box"][1])
            draw_en.text((x1, max(0, y1 - 14)), region["detector_text"],
                         fill=outline, font=font_sm)
        text_en_img.save(text_en_path, "JPEG", quality=95)

        # ─── Stage 2: Translation EN → VI ────────────────────────────────────
        print("[Pipeline] Stage 2: Dịch văn bản…")
        vi_texts       = self._translate_texts(en_texts)
        translated_str = " | ".join(vi_texts) if vi_texts else ""
        with open(tit_path, "w", encoding="utf-8") as f:
            f.write(translated_str)
        _safe_print(f"[Pipeline]   Bản dịch: {translated_str[:120]}…")

        # Phân loại vùng: thực sự được dịch vs tên riêng giữ nguyên
        changed_regions   = []
        unchanged_regions = []
        for region, en_t, vi_t in zip(translatable_regions, en_texts, vi_texts):
            if _should_keep_original_region(en_t, vi_t):
                unchanged_regions.append(region)
            else:
                changed_regions.append(region)
        _safe_print(f"[Pipeline]   Đã dịch {len(changed_regions)} block, giữ nguyên {len(unchanged_regions)} tên riêng")

        # ─── Stage 3: Inpainting — chỉ xóa vùng thực sự thay đổi ────────────
        print("[Pipeline] Stage 3: Inpainting…")
        mask          = _create_text_mask(original_np.shape, changed_regions)
        inpainted_np  = _inpaint_text(original_np, mask, changed_regions)
        inpainted_pil = Image.fromarray(inpainted_np)
        inpainted_pil.save(back_path, "JPEG", quality=95)

        # ─── Stage 4: Render tiếng Việt ──────────────────────────────────────
        print("[Pipeline] Stage 4: Vẽ văn bản tiếng Việt…")
        fuse_img     = inpainted_pil.copy()
        text_vi_img  = inpainted_pil.copy()
        enhancer     = ImageEnhance.Brightness(text_vi_img)
        text_vi_img  = enhancer.enhance(0.6)
        render_styles = _prepare_render_styles(original_pil, translatable_regions, vi_texts, self.font_path)

        # Khôi phục pixel gốc cho vùng tên riêng (không inpaint, không vẽ lại)
        for region in unchanged_regions:
            _restore_original_region(fuse_img, original_pil, region["box"])
            _restore_original_region(text_vi_img, original_pil, region["box"])

        # Tái dùng ImageDraw cho cả 2 ảnh (tránh tạo lại mỗi block)
        fuse_draw_cache    = {}
        vi_draw_cache      = {}
        for idx, (region, en_text, vi_text) in enumerate(zip(translatable_regions, en_texts, vi_texts)):
            if not vi_text.strip() or _should_keep_original_region(en_text, vi_text):
                continue          # tên riêng: giữ pixel gốc, không vẽ lại
            box = region["box"]
            style = render_styles[idx] if idx < len(render_styles) else None
            _draw_text_on_image(fuse_img,    box, vi_text, self.font_path, original_pil, region, style, fuse_draw_cache)
            _draw_text_on_image(text_vi_img, box, vi_text, self.font_path, original_pil, region, style, vi_draw_cache)

        text_vi_img.save(text_vi_path, "JPEG", quality=95)
        fuse_img.save(fuse_path,       "JPEG", quality=95)

        qa_warnings = []
        try:
            final_ocr_regions = self._run_ocr(fuse_path)
        except Exception as exc:
            final_ocr_regions = []
            qa_warnings.append(f"final OCR QA failed: {exc}")
        qa_report = build_leftover_english_qa(
            en_texts,
            vi_texts,
            visual_regions=final_ocr_regions,
            protected_source_texts=[r.get("detector_text", "") for r in unchanged_regions],
            warnings=qa_warnings,
        )
        write_qa_report(qa_path, qa_report)
        if qa_report.get("has_leftover_english"):
            _safe_print(f"[QA] English leftovers detected: {qa_report.get('issue_count', 0)}")

        print("[Pipeline] Hoàn tất.")
        return translated_str

    # ──────────────────────────────────────────────────────────────────────────

    def run_inference_streaming(self, input_img_path: str, output_dir: str):
        """
        Generator pipeline — yields partial PIL Images and metadata after each step.

        Yield sequence:
          {"event": "stage",    "stage": "ocr",     "progress": 10, "message": str}
          {"event": "ocr_done", "count": int,        "progress": 25, "text_en_pil": PIL}
          {"event": "stage",    "stage": "inpaint",  "progress": 30, "message": str}
          {"event": "back_done","back_pil": PIL,      "progress": 45}
          {"event": "translating","index": int, "total": int, "text_en": str, "progress": int}
          {"event": "line_done", "index": int, "total": int, "text_en": str, "text_vi": str,
                                 "partial_fuse_pil": PIL, "progress": int}
          {"event": "done",      "fuse_pil": PIL, "text_en_pil": PIL, "text_vi_pil": PIL,
                                 "back_pil": PIL, "tit": str, "progress": 100}
        """
        import torch

        if not self.loaded:
            self.load_models()

        os.makedirs(output_dir, exist_ok=True)

        back_path    = os.path.join(output_dir, "back.jpg")
        text_en_path = os.path.join(output_dir, "text_en.jpg")
        text_vi_path = os.path.join(output_dir, "text_vi.jpg")
        fuse_path    = os.path.join(output_dir, "fuse.jpg")
        tit_path     = os.path.join(output_dir, "tit.txt")
        ocr_path     = os.path.join(output_dir, "ocr.txt")
        qa_path      = os.path.join(output_dir, "qa.json")

        original_pil = Image.open(input_img_path).convert("RGB")
        original_np  = np.array(original_pil)

        # ─── Stage 1: OCR ─────────────────────────────────────────────────────
        yield {"event": "stage", "stage": "ocr", "progress": 10,
               "message": "Đang nhận dạng chữ trong ảnh..."}

        regions              = self._run_ocr(input_img_path)
        # Pre-compute translatability một lần
        image_size = original_pil.size
        translatable_flags   = {id(r): _should_translate_region(r, image_size) for r in regions}
        translatable_regions = _group_paragraph_regions(
            [r for r in regions if translatable_flags[id(r)]],
            original_pil.width,
        )
        en_texts             = [r["detector_text"] for r in translatable_regions]
        ocr_text             = "\n".join(
            str(region.get("detector_text", "")).strip()
            for region in regions
            if str(region.get("detector_text", "")).strip()
        )
        with open(ocr_path, "w", encoding="utf-8") as f:
            f.write(ocr_text)
        _safe_print(f"[Stream] OCR: {len(regions)} vùng, {len(translatable_regions)} block cần dịch")

        # Build text_en overlay
        text_en_pil = original_pil.copy()
        draw_en     = ImageDraw.Draw(text_en_pil)
        font_sm     = _load_font(self.font_path, 12)
        for region in regions:
            polygon = [(int(p[0]), int(p[1])) for p in region["polygon"]]
            outline = (255, 0, 0) if translatable_flags[id(region)] else (130, 130, 130)
            draw_en.polygon(polygon, outline=outline, width=2)
            x1, y1 = int(region["box"][0]), int(region["box"][1])
            draw_en.text((x1, max(0, y1 - 14)), region["detector_text"],
                         fill=outline, font=font_sm)
        text_en_pil.save(text_en_path, "JPEG", quality=95)

        yield {"event": "ocr_done", "count": len(translatable_regions),
               "progress": 25, "text_en_pil": text_en_pil,
               "ocr_text": ocr_text}

        # ─── Stage 2: Dịch trước để biết vùng nào là tên riêng ───────────────
        yield {"event": "stage", "stage": "translate", "progress": 30,
               "message": "Đang dịch văn bản..."}

        vi_texts = self._translate_texts(en_texts)

        # Phân loại: vùng thực sự được dịch vs tên riêng giữ nguyên
        changed_regions   = []
        unchanged_regions = []
        for region, en_t, vi_t in zip(translatable_regions, en_texts, vi_texts):
            if _should_keep_original_region(en_t, vi_t):
                unchanged_regions.append(region)
            else:
                changed_regions.append(region)
        _safe_print(f"[Stream] Đã dịch {len(changed_regions)} block, giữ nguyên {len(unchanged_regions)} tên riêng")

        # ─── Stage 3: Inpainting — chỉ xóa vùng thực sự thay đổi ────────────
        yield {"event": "stage", "stage": "inpaint", "progress": 38,
               "message": "Đang xóa chữ gốc khỏi ảnh..."}

        mask          = _create_text_mask(original_np.shape, changed_regions)
        inpainted_np  = _inpaint_text(original_np, mask, changed_regions)
        inpainted_pil = Image.fromarray(inpainted_np)
        inpainted_pil.save(back_path, "JPEG", quality=95)

        yield {"event": "back_done", "back_pil": inpainted_pil, "progress": 48}

        # ─── Stage 4: Render + khôi phục pixel tên riêng ─────────────────────
        total       = max(1, len(translatable_regions))
        fuse_img    = inpainted_pil.copy()
        text_vi_img = inpainted_pil.copy()
        enhancer    = ImageEnhance.Brightness(text_vi_img)
        text_vi_img = enhancer.enhance(0.6)

        # Khôi phục pixel gốc cho tên riêng không dịch
        for region in unchanged_regions:
            _restore_original_region(fuse_img, original_pil, region["box"])
            _restore_original_region(text_vi_img, original_pil, region["box"])

        render_styles = _prepare_render_styles(
            original_pil, translatable_regions, vi_texts, self.font_path
        )

        yield {"event": "stage", "stage": "render", "progress": 50,
               "message": "Đang vẽ văn bản tiếng Việt..."}

        # Tái dùng ImageDraw giữa các block
        fuse_draw_cache = {}
        vi_draw_cache   = {}
        for idx, (region, en_text, vi_text) in enumerate(zip(translatable_regions, en_texts, vi_texts)):
            progress_now = int(50 + (idx / total) * 43)
            yield {"event": "translating", "index": idx, "total": total,
                   "text_en": en_text, "progress": progress_now,
                   "message": f"Đang vẽ khối văn bản {idx + 1}/{total}..."}

            if _should_keep_original_region(en_text, vi_text):
                # Tên riêng: giữ pixel gốc, không vẽ lại
                progress_done = int(50 + ((idx + 1) / total) * 43)
                yield {
                    "event":            "line_done",
                    "index":            idx,
                    "total":            total,
                    "text_en":          en_text,
                    "text_vi":          vi_text,
                    "partial_fuse_pil": fuse_img.copy(),
                    "progress":         progress_done,
                    "unchanged":        True,
                }
                continue

            box   = region["box"]
            style = render_styles[idx] if idx < len(render_styles) else None
            _draw_text_on_image(fuse_img,    box, vi_text, self.font_path, original_pil, region, style, fuse_draw_cache)
            _draw_text_on_image(text_vi_img, box, vi_text, self.font_path, original_pil, region, style, vi_draw_cache)

            partial_path = os.path.join(output_dir, "fuse_partial.jpg")
            fuse_img.save(partial_path, "JPEG", quality=88)

            progress_done = int(50 + ((idx + 1) / total) * 43)
            yield {
                "event":            "line_done",
                "index":            idx,
                "total":            total,
                "text_en":          en_text,
                "text_vi":          vi_text,
                "partial_fuse_pil": fuse_img.copy(),
                "progress":         progress_done,
                "unchanged":        False,
            }

        # ─── Finalise ─────────────────────────────────────────────────────────
        text_vi_img.save(text_vi_path, "JPEG", quality=95)
        fuse_img.save(fuse_path,       "JPEG", quality=95)

        translated_str = " | ".join(vi_texts) if vi_texts else ""
        with open(tit_path, "w", encoding="utf-8") as f:
            f.write(translated_str)

        qa_warnings = []
        try:
            final_ocr_regions = self._run_ocr(fuse_path)
        except Exception as exc:
            final_ocr_regions = []
            qa_warnings.append(f"final OCR QA failed: {exc}")
        qa_report = build_leftover_english_qa(
            en_texts,
            vi_texts,
            visual_regions=final_ocr_regions,
            protected_source_texts=[r.get("detector_text", "") for r in unchanged_regions],
            warnings=qa_warnings,
        )
        write_qa_report(qa_path, qa_report)
        if qa_report.get("has_leftover_english"):
            _safe_print(f"[QA] English leftovers detected: {qa_report.get('issue_count', 0)}")

        _safe_print(f"[Stream] Hoàn tất. Bản dịch: {translated_str[:80]}…")

        yield {
            "event":       "done",
            "fuse_pil":    fuse_img,
            "text_en_pil": text_en_pil,
            "text_vi_pil": text_vi_img,
            "back_pil":    inpainted_pil,
            "tit":         translated_str,
            "ocr_text":    ocr_text,
            "qa":          qa_report,
            "progress":    100,
        }


# ─── Singleton toàn cục ───────────────────────────────────────────────────────
# Được tạo khi import; load_models() gọi sau trong app.py
pipeline = DebackPipeline()
