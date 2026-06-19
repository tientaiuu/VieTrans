# Sử dụng Python 3.10
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài các thư viện hệ thống cần thiết cho OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirement và cài đặt
COPY requirements.txt .

# 1. PyTorch CPU (nhẹ, phù hợp HuggingFace Space miễn phí)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. PaddlePaddle CPU (PP-OCRv5 backend)
RUN pip install --no-cache-dir paddlepaddle \
    -i https://www.paddlepaddle.org.cn/packages/stable/cpu/

# 3. Phần còn lại (PaddleOCR, FastAPI, NLLB, Auth, ...)
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code BE-Models vào
COPY . .

# Hugging Face yêu cầu ứng dụng phải chạy ở cổng 7860
EXPOSE 7860

# Cấu hình để Python có thể tìm thấy thư viện trong thư mục server
ENV PYTHONPATH="/app/server:${PYTHONPATH}"

# Chạy FastAPI (app.py nằm trong thư mục server)
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
