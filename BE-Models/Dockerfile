# Sử dụng Python 3.10
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy requirement và cài đặt
COPY requirements.txt .
# Tải PyTorch phiên bản CPU để nhẹ và phù hợp với HuggingFace Space miễn phí
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code BE-Models vào
COPY . .

# Hugging Face yêu cầu ứng dụng phải chạy ở cổng 7860
EXPOSE 7860

# Cấu hình để Python có thể tìm thấy thư viện trong thư mục server
ENV PYTHONPATH="/app/server:${PYTHONPATH}"

# Chạy FastAPI (app.py nằm trong thư mục server)
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
