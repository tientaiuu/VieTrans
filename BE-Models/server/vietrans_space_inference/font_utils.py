import os
from functools import lru_cache
from pathlib import Path

from PIL import ImageFont


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
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/ariali.ttf",
    "C:/Windows/Fonts/arialbi.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
]

READABLE_FONT_SEARCH_PATHS = [
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]


def _truthy_env(name, default=""):
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on", "y"}


def _readable_font_policy_enabled():
    policy = os.getenv("RENDER_FONT_POLICY", "readable_fixed").strip().lower()
    return policy in {"readable_fixed", "fixed_readable", "fixed", "google_lens"}


def _font_matching_enabled():
    return _truthy_env("RENDER_ENABLE_FONT_MATCHING")


def _preferred_readable_font(render_font_path=None):
    explicit = os.getenv("RENDER_READABLE_FONT_PATH", "")
    if explicit and os.path.exists(explicit):
        return explicit
    if render_font_path and os.path.exists(render_font_path):
        return render_font_path
    for font_path in READABLE_FONT_SEARCH_PATHS + FONT_SEARCH_PATHS:
        if font_path and os.path.exists(font_path):
            return font_path
    return render_font_path or None


def _find_system_font(render_font_path=None):
    if render_font_path is None:
        render_font_path = os.getenv("RENDER_FONT_PATH", "")
    if _readable_font_policy_enabled() and not _font_matching_enabled():
        readable_font = _preferred_readable_font(render_font_path)
        if readable_font:
            return readable_font
    if render_font_path and os.path.exists(render_font_path):
        return render_font_path
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
    files = []
    for font_dir in font_dirs:
        if not font_dir.exists():
            continue
        for pattern in ("*.ttf", "*.otf", "*.ttc"):
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


def _font_variant_candidates(font_path, bold=False, italic=False, condensed=False):
    names = []
    if bold and italic:
        names.extend([
            "DejaVuSansCondensed-BoldOblique.ttf" if condensed else "DejaVuSans-BoldOblique.ttf",
            "LiberationSans-BoldItalic.ttf",
            "NotoSans-BoldItalic.ttf",
            "arialbi.ttf",
            "segoeuiz.ttf",
        ])
    elif bold:
        names.extend([
            "DejaVuSansCondensed-Bold.ttf" if condensed else "DejaVuSans-Bold.ttf",
            "LiberationSans-Bold.ttf",
            "NotoSans-Bold.ttf",
            "NotoSansCJK-Bold.ttc",
            "arialbd.ttf",
            "segoeuib.ttf",
        ])
    elif italic:
        names.extend([
            "DejaVuSansCondensed-Oblique.ttf" if condensed else "DejaVuSans-Oblique.ttf",
            "LiberationSans-Italic.ttf",
            "NotoSans-Italic.ttf",
            "ariali.ttf",
            "segoeuii.ttf",
        ])
    elif condensed:
        names.extend(["DejaVuSansCondensed.ttf", "LiberationSans-Regular.ttf", "arial.ttf"])

    candidates = []
    if font_path:
        base = Path(font_path)
        candidates.extend(str(base.with_name(name)) for name in names)
        candidates.append(font_path)
    candidates.extend(FONT_SEARCH_PATHS)
    candidates.extend(_system_font_files())
    return candidates


@lru_cache(maxsize=256)
def _load_font_cached(candidate: str, size: int):
    try:
        return ImageFont.truetype(candidate, size, encoding="utf-8")
    except (OSError, IOError):
        return None


def _load_font(font_path, size, bold=False, italic=False, condensed=False):
    if _readable_font_policy_enabled() and not _font_matching_enabled():
        font_path = _preferred_readable_font(font_path)
        italic = False
        condensed = False
    for candidate in _font_variant_candidates(font_path, bold=bold, italic=italic, condensed=condensed):
        if not candidate:
            continue
        font = _load_font_cached(candidate, size)
        if font is not None:
            return font
    font = _load_font_cached("arial.ttf", size)
    return font if font is not None else ImageFont.load_default()


def _text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _wrap_text(draw, text, font, max_width):
    words = str(text).split()
    if not words:
        return [""]
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if _text_size(draw, candidate, font)[0] <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        if _text_size(draw, word, font)[0] <= max_width:
            current = word
            continue
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
    return values[mid] if len(values) % 2 else (values[mid - 1] + values[mid]) / 2.0
