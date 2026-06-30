import re
from collections import Counter
from statistics import median

from .font_utils import _font_matching_enabled, _readable_font_policy_enabled


def _box(region):
    return [float(v) for v in region.get("box", (0, 0, 0, 0))]


def _words(text):
    return re.findall(r"[^\W\d_]+", str(text or ""), flags=re.UNICODE)


def _median_color(colors):
    if not colors:
        return None
    channels = list(zip(*[tuple(int(v) for v in color[:3]) for color in colors]))
    return tuple(int(round(median(channel))) for channel in channels)


def _mode(values, default=None):
    values = [value for value in values if value is not None]
    if not values:
        return default
    return Counter(values).most_common(1)[0][0]


def _is_repeated_label_candidate(style, region, image_width, image_height):
    if style.get("layout_type") != "line" or style.get("ui_list_item"):
        return False
    text = str(region.get("detector_text", "")).strip()
    if not text:
        return False
    word_count = len(_words(text))
    if word_count > 6 or len(text) > 64:
        return False
    x1, y1, x2, y2 = _box(region)
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    if box_h > max(44.0, image_height * 0.075):
        return False
    if box_w > image_width * 0.42:
        return False
    target_size = float(style.get("target_size", box_h))
    if y1 < image_height * 0.12 and target_size > max(24.0, image_height * 0.032):
        return False
    return True


def _similar_size_indexes(styles, candidate_indexes):
    if len(candidate_indexes) < 5:
        return []
    sizes = [float(styles[idx].get("target_size", 0)) for idx in candidate_indexes]
    positive_sizes = [size for size in sizes if size > 0]
    if not positive_sizes:
        return []
    med = median(positive_sizes)
    if med <= 0:
        return []
    return [
        idx for idx in candidate_indexes
        if med * 0.42 <= float(styles[idx].get("target_size", med)) <= med * 1.7
    ]


def harmonize_repeated_label_styles(styles, regions, translated_texts, image_size):
    if not styles or not regions:
        return styles
    image_width, image_height = image_size
    candidate_indexes = [
        idx for idx, style in enumerate(styles)
        if idx < len(regions) and _is_repeated_label_candidate(style, regions[idx], image_width, image_height)
    ]
    candidate_indexes = _similar_size_indexes(styles, candidate_indexes)
    if len(candidate_indexes) < 5:
        return styles

    sizes = [float(styles[idx].get("target_size", 0)) for idx in candidate_indexes]
    common_size = max(7, int(round(median(sizes))))
    common_size = min(common_size, 36)
    readable_fixed_font = _readable_font_policy_enabled() and not _font_matching_enabled()
    common_bold = bool(_mode([bool(styles[idx].get("bold", False)) for idx in candidate_indexes], False))
    common_italic = False if readable_fixed_font else bool(_mode([bool(styles[idx].get("italic", False)) for idx in candidate_indexes], False))
    common_condensed = False if readable_fixed_font else bool(_mode([bool(styles[idx].get("condensed", False)) for idx in candidate_indexes], False))
    common_font_path = None if readable_fixed_font else _mode([styles[idx].get("font_path") for idx in candidate_indexes], None)
    common_color = _median_color([styles[idx].get("color") for idx in candidate_indexes if styles[idx].get("color")])
    common_h_pad = max(1, int(round(median(float(styles[idx].get("h_pad", 1)) for idx in candidate_indexes))))
    common_v_pad = max(1, int(round(median(float(styles[idx].get("v_pad", 1)) for idx in candidate_indexes))))

    harmonized = list(styles)
    for idx in candidate_indexes:
        style = dict(harmonized[idx])
        style.update({
            "target_size": common_size,
            "max_size": common_size,
            "min_size": max(7, int(round(common_size * 0.76))),
            "bold": common_bold,
            "italic": common_italic,
            "condensed": common_condensed,
            "align": "center",
            "h_pad": common_h_pad,
            "v_pad": common_v_pad,
            "line_spacing": min(float(style.get("line_spacing", 1.08)), 1.1),
            "harmonized_label_group": True,
        })
        if readable_fixed_font:
            style.pop("font_path", None)
            style["font_policy"] = "readable_fixed"
        if common_font_path:
            style["font_path"] = common_font_path
        if common_color:
            style["color"] = common_color
        harmonized[idx] = style
    return harmonized
