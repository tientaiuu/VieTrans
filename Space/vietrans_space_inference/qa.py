import json
import re
from pathlib import Path


_LATIN_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9.+-]*")
_VI_MARK_RE = re.compile(
    r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩị"
    r"óòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]",
    re.IGNORECASE,
)

_ALLOWED_LATIN = {
    "ai", "api", "app", "bluetooth", "cpu", "en", "gpu", "hf", "id", "ios",
    "ip", "lcd", "led", "nllb", "ocr", "sim", "ui", "url", "usb", "vi",
    "wi", "wifi", "wi-fi",
}

_EN_FUNCTION_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "behind", "beside", "between",
    "by", "for", "from", "in", "inside", "into", "is", "near", "next", "of",
    "off", "on", "or", "outside", "over", "the", "to", "under", "with",
}

_EN_COMMON_WORDS = {
    "airplane", "animal", "animals", "around", "back", "bar", "brightness",
    "chef", "connection", "connections", "display", "disturb", "doctor",
    "driver", "fire", "fingerprint", "front", "inside", "lockscreen",
    "magazine", "mode", "mobile", "network", "notification", "office",
    "other", "passcode", "password", "screen", "settings", "sound", "status",
    "teacher", "vibrate", "wallpaper", "wireless",
}

_VIETNAMESE_WORDS = {
    "anh", "ban", "bao", "ben", "boi", "cac", "cai", "can", "che", "cho",
    "chu", "cua", "duoc", "gan", "giua", "hinh", "khong", "la", "lam",
    "man", "mat", "mot", "nguoi", "nhan", "phia", "sau", "thanh", "thiet",
    "trang", "trong", "van", "voi", "xung",
}


def _tokens(text):
    return [token.lower() for token in _LATIN_TOKEN_RE.findall(str(text or ""))]


def _content_tokens(text):
    return {
        token
        for token in _tokens(text)
        if len(token) >= 2 and token not in _ALLOWED_LATIN and not token.isdigit()
    }


def _norm(text):
    return re.sub(r"[^a-z0-9]+", " ", str(text or "").lower()).strip()


def _has_vietnamese_signal(text):
    if _VI_MARK_RE.search(str(text or "")):
        return True
    tokens = set(_tokens(text))
    return bool(tokens & _VIETNAMESE_WORDS)


def _english_score(tokens, source_tokens):
    token_set = {token for token in tokens if token not in _ALLOWED_LATIN}
    overlap = token_set & source_tokens
    english_words = token_set & (_EN_FUNCTION_WORDS | _EN_COMMON_WORDS)
    score = len(overlap) * 2 + len(english_words)
    return score, sorted(overlap), sorted(english_words)


def _text_issue(source_text, translated_text, source_tokens, index):
    translated = str(translated_text or "").strip()
    if not translated:
        return None

    translated_tokens = _content_tokens(translated)
    if not translated_tokens:
        return None

    exact_unchanged = _norm(source_text) and _norm(source_text) == _norm(translated)
    score, overlap, english_words = _english_score(translated_tokens, source_tokens)

    if exact_unchanged:
        score += 3

    if score < 3:
        return None
    if _has_vietnamese_signal(translated) and not overlap and not exact_unchanged:
        return None

    return {
        "kind": "translation_text",
        "index": index,
        "source": str(source_text or ""),
        "translated": translated,
        "overlap_tokens": overlap,
        "english_tokens": english_words,
        "confidence": min(0.99, 0.45 + score * 0.1),
    }


def _visual_issue(region, source_tokens, source_text_norms, protected_texts, index):
    text = str(region.get("detector_text", "") if isinstance(region, dict) else "").strip()
    if not text:
        return None
    if _norm(text) in protected_texts:
        return None

    tokens = _content_tokens(text)
    if not tokens:
        return None

    score, overlap, english_words = _english_score(tokens, source_tokens)
    if _norm(text) in source_text_norms:
        score += 2
    if score < 3:
        return None
    if _has_vietnamese_signal(text) and not overlap:
        return None

    issue = {
        "kind": "visual_ocr",
        "index": index,
        "text": text,
        "overlap_tokens": overlap,
        "english_tokens": english_words,
        "confidence": min(0.99, 0.5 + score * 0.1),
    }
    if isinstance(region, dict) and "box" in region:
        issue["box"] = [float(v) for v in region.get("box", [])]
    return issue


def build_leftover_english_qa(
    source_texts,
    translated_texts,
    visual_regions=None,
    protected_source_texts=None,
    warnings=None,
):
    source_texts = [str(text or "") for text in (source_texts or [])]
    translated_texts = [str(text or "") for text in (translated_texts or [])]
    visual_regions = visual_regions or []
    protected_texts = {_norm(text) for text in (protected_source_texts or []) if _norm(text)}
    source_text_norms = {_norm(text) for text in source_texts if _norm(text)}
    source_tokens = set()
    for text in source_texts:
        source_tokens.update(_content_tokens(text))

    issues = []
    for idx, (source, translated) in enumerate(zip(source_texts, translated_texts)):
        if _norm(source) in protected_texts:
            continue
        issue = _text_issue(source, translated, source_tokens, idx)
        if issue:
            issues.append(issue)

    for idx, region in enumerate(visual_regions):
        issue = _visual_issue(region, source_tokens, source_text_norms, protected_texts, idx)
        if issue:
            issues.append(issue)

    visual_count = sum(1 for issue in issues if issue["kind"] == "visual_ocr")
    severity = "pass"
    if visual_count:
        severity = "high"
    elif issues:
        severity = "medium"

    return {
        "has_leftover_english": bool(issues),
        "severity": severity,
        "issue_count": len(issues),
        "visual_issue_count": visual_count,
        "issues": issues[:20],
        "warnings": [str(item) for item in (warnings or []) if item],
    }


def write_qa_report(path, report):
    Path(path).write_text(
        json.dumps(report or {}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
