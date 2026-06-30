def _clamp(value, lower, upper):
    if upper < lower:
        return lower
    return max(lower, min(upper, value))


def _safe_box(box, width, height, pad=0):
    width = max(1, int(round(width)))
    height = max(1, int(round(height)))
    x1, y1, x2, y2 = [float(v) for v in box]
    x1 = int(max(0, min(width - 1, round(x1 - pad))))
    y1 = int(max(0, min(height - 1, round(y1 - pad))))
    x2 = int(max(1, min(width, round(x2 + pad))))
    y2 = int(max(1, min(height, round(y2 + pad))))
    if x2 <= x1:
        x2 = min(width, x1 + 1)
    if y2 <= y1:
        y2 = min(height, y1 + 1)
    return x1, y1, x2, y2


def _expanded_render_box(box, width, height, paragraph=False):
    x1, y1, x2, y2 = [float(v) for v in box]
    box_w = max(1.0, x2 - x1)
    box_h = max(1.0, y2 - y1)
    if paragraph:
        pad_right = min(max(6.0, box_w * 0.025), 18.0)
        pad_bottom = min(max(10.0, box_h * 0.12), 34.0)
        pad_top = min(max(2.0, box_h * 0.01), 5.0)
        return _safe_box((x1, y1 - pad_top, x2 + pad_right, y2 + pad_bottom), width, height)

    pad_x = min(max(2.0, box_w * 0.08), 14.0)
    pad_y = min(max(1.0, box_h * 0.12), 8.0)
    return _safe_box((x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y), width, height)


def _source_line_boxes(region, width, height):
    boxes = []
    for line in (region or {}).get("source_lines") or []:
        raw_box = line.get("box") if isinstance(line, dict) else None
        if not raw_box or len(raw_box) < 4:
            continue
        try:
            boxes.append(_safe_box(raw_box, width, height))
        except (TypeError, ValueError):
            continue
    return boxes


def _baseline_ratio(style):
    if style.get("layout_type") == "paragraph":
        return 0.78
    if style.get("ui_list_item"):
        return 0.76
    return 0.77


def _build_text_layout(source_box, image_width, image_height, style, region=None):
    is_paragraph = style.get("layout_type") == "paragraph"
    source_box = _safe_box(source_box, image_width, image_height)
    render_box = _expanded_render_box(source_box, image_width, image_height, paragraph=is_paragraph)
    sx1, sy1, sx2, sy2 = source_box
    rx1, ry1, rx2, ry2 = render_box
    source_w = max(1, sx2 - sx1)
    source_h = max(1, sy2 - sy1)
    source_center_x = sx1 + source_w / 2.0
    source_center_y = sy1 + source_h / 2.0
    line_boxes = _source_line_boxes(region, image_width, image_height)
    first_line_box = line_boxes[0] if line_boxes else source_box
    flx1, fly1, flx2, fly2 = first_line_box
    first_line_h = max(1, fly2 - fly1)
    baseline_y = fly1 + first_line_h * _baseline_ratio(style)

    align = style.get("align", "left")
    if is_paragraph:
        anchor_x = float(flx1)
        anchor_y = float(fly1)
        anchor_mode = "source_top_left"
    elif align == "center":
        anchor_x = source_center_x
        anchor_y = source_center_y
        anchor_mode = "source_center"
    else:
        anchor_x = float(sx1)
        anchor_y = source_center_y
        anchor_mode = "source_left_center"

    return {
        "source_box": source_box,
        "source_line_boxes": line_boxes,
        "render_box": render_box,
        "source_width": source_w,
        "source_height": source_h,
        "render_width": max(1, rx2 - rx1),
        "render_height": max(1, ry2 - ry1),
        "anchor_x": anchor_x,
        "anchor_y": anchor_y,
        "baseline_y": baseline_y,
        "center_x": source_center_x,
        "center_y": source_center_y,
        "anchor_mode": anchor_mode,
        "align": align,
        "h_pad": float(style.get("h_pad", 0)),
        "v_pad": float(style.get("v_pad", 0)),
        "layout_type": style.get("layout_type", "line"),
        "ui_list_item": bool(style.get("ui_list_item")),
    }


def _anchored_line_width(layout, fallback_width):
    rx1, _, rx2, _ = [float(v) for v in layout["render_box"]]
    h_pad = float(layout.get("h_pad", 0))
    margin = min(h_pad, max(0.0, layout.get("source_width", 1) * 0.04))
    left_limit = rx1 + margin
    right_limit = rx2 - margin
    anchor_x = float(layout["anchor_x"])
    fallback_width = max(1.0, float(fallback_width))
    if layout.get("align") == "center":
        available = 2.0 * min(anchor_x - left_limit, right_limit - anchor_x)
    else:
        available = right_limit - anchor_x
    return max(1, int(round(min(fallback_width, max(1.0, available)))))


def _position_text_lines(draw, layout, lines, font, line_h, stroke_width=0, line_scale_x=1.0):
    if not lines:
        return []

    rx1, ry1, rx2, ry2 = [float(v) for v in layout["render_box"]]
    h_pad = float(layout.get("h_pad", 0))
    v_pad = float(layout.get("v_pad", 0))
    is_paragraph = layout.get("layout_type") == "paragraph"
    align = layout.get("align", "left")

    measured = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
        width = max(1, bbox[2] - bbox[0])
        height = max(1, bbox[3] - bbox[1])
        render_width = max(1, int(round(width * line_scale_x)))
        measured.append({
            "text": line,
            "bbox": bbox,
            "width": width,
            "height": height,
            "render_width": render_width,
        })

    total_h = max(1, int(line_h) * len(measured))
    block_h = measured[0]["height"] if (not is_paragraph and len(measured) == 1) else total_h
    if is_paragraph:
        desired_y = float(layout["anchor_y"])
    elif len(measured) == 1:
        desired_y = float(layout["center_y"]) - measured[0]["height"] / 2.0
    else:
        desired_y = float(layout["center_y"]) - total_h / 2.0

    min_y = ry1 + min(v_pad, max(0.0, layout.get("source_height", 1) * 0.08))
    max_y = ry2 - block_h - min(v_pad, max(0.0, layout.get("source_height", 1) * 0.08))
    y = _clamp(desired_y, min_y, max_y)

    positions = []
    for item in measured:
        if align == "center":
            desired_x = float(layout["anchor_x"]) - item["render_width"] / 2.0
        else:
            desired_x = float(layout["anchor_x"])
        min_x = rx1 + min(h_pad, max(0.0, layout.get("source_width", 1) * 0.04))
        max_x = rx2 - item["render_width"] - min(h_pad, max(0.0, layout.get("source_width", 1) * 0.04))
        x = _clamp(desired_x, min_x, max_x)
        positions.append({**item, "x": x, "y": y})
        y += int(line_h)
    return positions
