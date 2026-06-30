import re

from .font_utils import _font_metrics, _load_font, _median_float, _text_size, _wrap_text
from .text_processing import _glossary_translate


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
        if y2 > y1:
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
    x1, _, x2, y2 = [float(v) for v in region.get("box", (0, 0, 0, 0))]
    y1 = float(region.get("box", (0, 0, 0, 0))[1])
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    if box_h > 34 or box_w > max(1.0, image_width) * 0.72:
        return False
    return bool(_glossary_translate(text))


def _paragraph_spacing_candidates(line_spacing):
    base = max(1.08, float(line_spacing or 1.18))
    raw_values = [base, base * 0.92, base * 0.84, base * 0.76, 1.56, 1.42, 1.28, 1.18, 1.12]
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
        if line_h <= max_text_h and _text_size(draw, line_text, font)[0] <= max_text_w:
            return font, [line_text], line_h
    return None


def _fit_font_and_wrap(draw, text, box_width, box_height, font_path,
                       min_size=8, max_size=72, h_pad=4, v_pad=2,
                       bold=False, italic=False, condensed=False,
                       line_spacing=1.08, prefer_single_line=False):
    max_text_w = max(1, box_width - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)
    if prefer_single_line:
        single = _fit_single_line_font(
            draw, text, box_width, box_height, font_path,
            min_size=min_size, max_size=max_size, h_pad=h_pad, v_pad=v_pad,
            bold=bold, italic=italic, condensed=condensed, line_spacing=line_spacing,
        )
        if single is not None:
            return single
        font = _load_font(font_path, min_size, bold=bold, italic=italic, condensed=condensed)
        line_h = max(1, int(_font_metrics(draw, font) * line_spacing))
        return font, [" ".join(str(text).split())], line_h

    best = None
    for size in range(max_size, min_size - 1, -1):
        font = _load_font(font_path, size, bold=bold, italic=italic, condensed=condensed)
        lines = _wrap_text(draw, text, font, max_text_w)
        line_h = max(1, int(_font_metrics(draw, font) * line_spacing))
        total_h = line_h * len(lines)
        widest = max((_text_size(draw, line, font)[0] for line in lines), default=0)
        if widest <= max_text_w and total_h <= max_text_h:
            best = (font, lines, line_h)
            break
    if best is not None:
        return best
    font = _load_font(font_path, min_size, bold=bold, italic=italic, condensed=condensed)
    return font, _wrap_text(draw, text, font, max_text_w), max(1, int(_font_metrics(draw, font) * line_spacing))


def _fit_paragraph_font_and_wrap(draw, text, box_width, box_height, font_path,
                                 min_size=9, max_size=32, h_pad=4, v_pad=2,
                                 bold=False, italic=False, condensed=False,
                                 line_spacing=1.18):
    max_text_w = max(1, box_width - 2 * h_pad)
    max_text_h = max(1, box_height - 2 * v_pad)
    best = None
    target_fill = min(0.78, max(0.62, 0.54 + min(float(line_spacing or 1.18), 2.4) * 0.08))
    for size in range(max_size, min_size - 1, -1):
        font = _load_font(font_path, size, bold=bold, italic=italic, condensed=condensed)
        lines = _wrap_text(draw, text, font, max_text_w)
        for spacing in _paragraph_spacing_candidates(line_spacing):
            line_h = max(1, int(_font_metrics(draw, font) * spacing))
            total_h = line_h * len(lines)
            widest = max((_text_size(draw, line, font)[0] for line in lines), default=0)
            if widest <= max_text_w and total_h <= max_text_h:
                fill_ratio = total_h / max_text_h
                score = -abs(fill_ratio - target_fill) + (size * 0.0015) - abs(spacing - float(line_spacing or 1.18)) * 0.035
                if best is None or score > best[0]:
                    best = (score, font, lines, line_h, spacing)
    if best is not None:
        _, font, lines, line_h, spacing = best
        return font, lines, line_h, spacing
    font, lines, line_h = _fit_font_and_wrap(
        draw, text, box_width, box_height, font_path,
        min_size=min_size, max_size=max_size, h_pad=h_pad, v_pad=v_pad,
        bold=bold, italic=italic, condensed=condensed, line_spacing=line_spacing,
    )
    return font, lines, line_h, line_spacing
