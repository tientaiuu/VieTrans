---
title: VieTrans — In-Image Machine Translation EN→VI
emoji: 🦀
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: "5.0.0"
app_file: app.py
pinned: false
license: mit
short_description: Dịch chữ trực tiếp trên ảnh từ Tiếng Anh sang Tiếng Việt
tags:
  - machine-translation
  - ocr
  - image-translation
  - nllb
  - paddleocr
  - vietnamese
  - zerogpu
---

# 🦀 VieTrans — In-Image Machine Translation (EN → VI)

Dịch chữ tiếng Anh trực tiếp trên ảnh sang tiếng Việt bằng pipeline:

```
Ảnh đầu vào ─► PaddleOCR PP-OCRv5 ─► NLLB-200 1.3B fine-tuned ─► OpenCV Inpainting ─► Ảnh kết quả
```

## Cấu trúc thư mục Space

```
Space/
├── app.py            ← Gradio UI + @spaces.GPU decorator
├── inference.py      ← DebackX pipeline (OCR + Translation + Render)
├── requirements.txt  ← Thư viện Python
├── packages.txt      ← Gói hệ thống Linux (OpenCV, fonts)
└── README.md         ← File này (cũng là Space card)
```

## Biến môi trường cần thiết

Trong cài đặt Space (Settings → Repository secrets), hãy đặt:

| Biến | Giá trị ví dụ | Mô tả |
|---|---|---|
| `NLLB_MODEL_PATH` | `tientaiuu/mt-nllb-1p3b-en-vi` | HuggingFace Hub ID của model fine-tuned |
| `NLLB_SRC_LANG` | `eng_Latn` | Mã ngôn ngữ nguồn (NLLB format) |
| `NLLB_TGT_LANG` | `vie_Latn` | Mã ngôn ngữ đích (NLLB format) |
| `OCR_MIN_CONFIDENCE` | `0.5` | Ngưỡng tin cậy tối thiểu của OCR |

## Yêu cầu

- Tài khoản HuggingFace **Pro** để dùng ZeroGPU
- Space type: **Gradio** (KHÔNG dùng Docker)
- Hardware: **ZeroGPU** (chọn trong Space Settings > Hardware)

## Ghi chú kỹ thuật

- **PaddleOCR** chạy trên **CPU** (`device="cpu"`) để tránh xung đột với ZeroGPU
- **NLLB** được load lên **CUDA** tại startup, GPU được cấp phát bởi `@spaces.GPU`
- Với mô hình NLLB 1.3B, mỗi lần dịch ảnh mất khoảng 10–30 giây (tùy số lượng vùng chữ)
