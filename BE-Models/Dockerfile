FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH="/app/server:${PYTHONPATH}" \
    VIETRANS_RUNTIME_DIR="/app/outputs/gateway"

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

COPY server ./server
RUN mkdir -p /app/outputs/gateway/jobs \
    && chown -R app:app /app

EXPOSE 7860

USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import socket; s=socket.create_connection(('127.0.0.1', 7860), 5); s.close()"

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]
