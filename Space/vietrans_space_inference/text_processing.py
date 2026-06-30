import math
import re
from difflib import get_close_matches


VIETNAMESE_MARK_RE = re.compile(
    r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]",
    re.IGNORECASE,
)
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

UI_KEEP_AS_IS = {"bluetooth", "wi fi", "wifi", "wi-fi", "sim"}

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
    return text[0].upper() + text[1:] if text else text


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
    return _capitalize_vi_label(" ".join(piece for piece in pieces if piece))


def _glossary_translate(text: str):
    core, suffix = _split_trailing_ui_suffix(text)
    key = _ui_text_key(core)
    if not key:
        return None
    translated = UI_TRANSLATION_GLOSSARY.get(key) or _translate_ui_key_by_terms(key)
    if translated is None:
        return None
    return f"{translated} {suffix}".strip() if suffix else translated


def _latin_token_set(text: str) -> set:
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9+-]*", str(text or ""))
        if len(token) >= 2
    }


def _is_nontranslatable_ui_token(text: str) -> bool:
    return _ui_text_key(text) in UI_KEEP_AS_IS


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
    if token_set & STRONG_VIETNAMESE_WORDS:
        return True
    vi_hits = token_set & VIETNAMESE_WORDS
    return len(vi_hits) >= 2 or "viet nam" in " ".join(tokens) or "tieng viet" in " ".join(tokens)


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
    return near_edge or (word_count <= 3 and compact_len <= 18)


def _should_translate_region(region, image_size=None):
    text = str(region.get("detector_text", "")).strip()
    if not text or _is_rotated_decorative_region(region, image_size):
        return False
    compact = re.sub(r"\s+", "", text)
    if not compact or _looks_like_domain_or_handle(text) or _is_nontranslatable_ui_token(text):
        return False
    if re.fullmatch(r"[\d.,:;+\-()]+", compact):
        return False
    if _is_probably_phonetic(text) or VIETNAMESE_MARK_RE.search(text) or _has_unaccented_vietnamese_words(text):
        return False
    letters = re.findall(r"[A-Za-z]", text)
    if len(letters) < 2:
        return False
    if len(letters) / max(1, len(compact)) < 0.45:
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
    return {
        "index": group[0].get("index", 0),
        "polygon": _rect_polygon((x1, y1, x2, y2)),
        "mask_polygons": [r["polygon"] for r in group],
        "source_lines": [
            {"text": str(r.get("detector_text", "")).strip(), "box": [float(v) for v in r["box"]]}
            for r in group
            if str(r.get("detector_text", "")).strip()
        ],
        "box": (x1, y1, x2, y2),
        "detector_text": text,
        "detector_confidence": min(float(r.get("detector_confidence", 1.0)) for r in group),
        "layout_type": "paragraph" if len(group) > 1 else "line",
        "line_count": len(group),
        "avg_line_height": sum(line_heights) / max(1, len(line_heights)),
    }


_CONTEXT_FUNCTION_WORDS = {
    "a", "an", "the", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their",
    "am", "is", "are", "was", "were", "be", "been", "being",
    "do", "does", "did", "have", "has", "had",
    "can", "could", "may", "might", "must", "should", "would", "will",
    "and", "or", "but", "because", "although", "while", "when", "where",
    "what", "which", "who", "whom", "whose", "why", "how", "than", "then",
    "in", "on", "at", "by", "for", "with", "about", "against", "between",
    "into", "through", "before", "after", "above", "below", "to", "from",
    "up", "down", "of", "off", "over", "under", "around", "out", "near",
    "past", "since", "within", "without", "across", "along", "beside",
    "behind", "beyond", "inside", "outside", "upon", "next",
}

_CONTEXT_PREPOSITION_PHRASES = {
    "in front of", "next to", "because of", "instead of", "out of", "into",
    "on top of", "in the middle of", "at the end of", "at the beginning of",
    "in the morning", "in the afternoon", "in the evening", "at night",
}


def _word_tokens(text):
    return re.findall(r"[A-Za-z]+", str(text or "").lower())


def _is_ui_label_like(region, image_width):
    text = str(region.get("detector_text", "")).strip()
    if not text:
        return False
    if _has_ui_translation_path(text) or _is_nontranslatable_ui_token(text):
        return True
    return False


def _is_contextual_fragment(region):
    text = str(region.get("detector_text", "")).strip()
    if not text:
        return False
    normalized = re.sub(r"[^a-z]+", " ", text.lower()).strip()
    words = _word_tokens(text)
    if not words:
        return False
    if normalized in _CONTEXT_PREPOSITION_PHRASES:
        return True
    if len(words) <= 5 and any(word in _CONTEXT_FUNCTION_WORDS for word in words):
        return True
    return False


def _uppercase_ratio(text):
    letters = re.findall(r"[A-Za-z]", str(text or ""))
    if not letters:
        return 0.0
    return sum(1 for ch in letters if ch.isupper()) / len(letters)


def _is_heading_like_fragment(region):
    text = str(region.get("detector_text", "")).strip()
    words = _word_tokens(text)
    if not words:
        return False
    if re.search(r"[.!?;:,]$", text):
        return False
    return _uppercase_ratio(text) >= 0.78 and len(words) <= 5 and len(text) <= 48


def _is_sentence_fragment(region, image_width):
    text = str(region.get("detector_text", "")).strip()
    if not text or _is_ui_label_like(region, image_width) or _is_heading_like_fragment(region):
        return False

    words = _word_tokens(text)
    if len(words) < 2:
        return False

    x1, _, x2, _ = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    box_w = max(1.0, x2 - x1)
    has_lowercase = any(ch.islower() for ch in text)
    compact_len = len(re.sub(r"\s+", "", text))

    return (
        compact_len >= 8
        and len(words) <= 6
        and has_lowercase
        and box_w >= max(18.0, image_width * 0.035)
    )


def _same_visual_line(previous, current, image_width):
    px1, py1, px2, py2 = [float(v) for v in previous.get("box", (0, 0, 0, 0))]
    cx1, cy1, cx2, cy2 = [float(v) for v in current.get("box", (0, 0, 0, 0))]
    prev_h = max(1.0, py2 - py1)
    curr_h = max(1.0, cy2 - cy1)
    avg_h = (prev_h + curr_h) / 2.0
    center_delta = abs(((py1 + py2) / 2.0) - ((cy1 + cy2) / 2.0))
    vertical_overlap = max(0.0, min(py2, cy2) - max(py1, cy1))
    overlap_ratio = vertical_overlap / max(1.0, min(prev_h, curr_h))
    horizontal_gap = cx1 - px2
    max_gap = max(18.0, avg_h * 1.8, image_width * 0.035)
    return center_delta <= avg_h * 0.48 and overlap_ratio >= 0.42 and -avg_h * 0.35 <= horizontal_gap <= max_gap


def _group_same_line_fragments(regions, image_width):
    sorted_regions = sorted(regions, key=lambda r: (float(r["box"][1]), float(r["box"][0])))
    lines = []
    current = []

    def flush_current():
        nonlocal current
        if current:
            merged = _merge_region_group(current)
            if len(current) > 1:
                merged = {
                    **merged,
                    "layout_type": "line",
                    "line_count": 1,
                }
            lines.append(merged)
            current = []

    for region in sorted_regions:
        if not current:
            current = [region]
            continue
        previous = current[-1]
        current_ui = _is_ui_label_like(_merge_region_group(current), image_width)
        next_ui = _is_ui_label_like(region, image_width)
        if (not current_ui and not next_ui and _same_visual_line(previous, region, image_width)):
            current.append(region)
        else:
            flush_current()
            current = [region]
    flush_current()
    return lines


def _is_body_text_line(region, image_width):
    text = str(region.get("detector_text", "")).strip()
    x1, _, x2, _ = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    box_w = max(1.0, x2 - x1)
    word_count = len(re.findall(r"[A-Za-z]+", text))
    return (
        word_count >= 5
        or len(text) >= 34
        or box_w >= image_width * 0.32
        or _is_sentence_fragment(region, image_width)
    )


def _can_merge_lines(previous, current, image_width):
    px1, py1, px2, py2 = [float(v) for v in previous.get("box", (0, 0, 0, 0))]
    cx1, cy1, cx2, cy2 = [float(v) for v in current.get("box", (0, 0, 0, 0))]
    prev_h = max(1.0, py2 - py1)
    curr_h = max(1.0, cy2 - cy1)
    avg_h = (prev_h + curr_h) / 2
    vertical_gap = cy1 - py2
    left_delta = abs(cx1 - px1)
    right_delta = abs(cx2 - px2)
    center_delta = abs(((cx1 + cx2) / 2.0) - ((px1 + px2) / 2.0))
    overlap = max(0.0, min(px2, cx2) - max(px1, cx1))
    narrow_w = max(1.0, min(px2 - px1, cx2 - cx1))
    height_ratio = min(prev_h, curr_h) / max(prev_h, curr_h)
    horizontal_ok = (
        left_delta <= max(44.0, image_width * 0.07)
        or center_delta <= max(48.0, image_width * 0.085)
        or overlap / narrow_w >= 0.42
        or right_delta <= max(64.0, image_width * 0.10)
    )
    previous_heading = _is_heading_like_fragment(previous)
    current_heading = _is_heading_like_fragment(current)
    if previous_heading != current_heading:
        return False
    if previous_heading and current_heading and vertical_gap > max(8.0, avg_h * 0.65):
        return False
    return (
        height_ratio >= 0.52
        and -avg_h * 0.35 <= vertical_gap <= max(28.0, avg_h * 1.8)
        and horizontal_ok
    )


def _group_paragraph_regions(regions, image_width):
    sorted_regions = _group_same_line_fragments(regions, image_width)
    grouped = []
    current = []

    def flush_current():
        nonlocal current
        if current:
            grouped.append(_merge_region_group(current))
            current = []

    for region in sorted_regions:
        is_contextual = _is_contextual_fragment(region)
        can_be_context_group = (
            not _is_ui_label_like(region, image_width)
            and (_is_body_text_line(region, image_width) or is_contextual)
        )
        if not can_be_context_group:
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
