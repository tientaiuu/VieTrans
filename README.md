# VieTrans Web Gateway for DebackX

VieTrans is the web application that calls the DebackX image-translation worker. The web app stays lightweight: it handles upload UI, authentication, history, downloads, and API proxying, while OCR, NLLB translation, masking, and rendering run in the DebackX worker service.

## Project Structure

- `FE/`: React + Vite frontend with studio upload, batch queue, editor, dashboard, auth, and API docs.
- `BE-Models/`: FastAPI gateway. It no longer contains the heavy model runtime; it forwards work to DebackX through `IIMT_WORKER_URL`.

## Runtime Architecture

1. User uploads an image from the Studio or calls `POST /api/upload`.
2. VieTrans backend validates the file and forwards it to the DebackX worker.
3. DebackX runs PaddleOCR, the fine-tuned NLLB 1.3B translation model, mask generation, and rendering.
4. VieTrans normalizes the result and exposes `input`, `result`, `mask`, and `metadata` URLs to the frontend.
5. If the request includes a valid user token, the result is saved to MongoDB history.

## Backend Setup

```bash
cd BE-Models
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp server/.env.example server/.env
```

Set the worker URL in `server/.env`:

```env
IIMT_WORKER_URL=http://localhost:8081
IIMT_WORKER_TIMEOUT_SECONDS=300
VIETRANS_MAX_UPLOAD_MB=20
```

Run the gateway:

```bash
cd BE-Models
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

## Docker Environment

Use Docker Compose when you want the web backend to run in an isolated environment with its own MongoDB:

```bash
cd /home/yusato/workspace/new-Vie
cp .env.docker.example .env
docker compose up --build
```

Default services:

- VieTrans frontend: `http://localhost:5173`
- VieTrans gateway: `http://localhost:8001`
- MongoDB: `localhost:27017`
- DebackX worker expected at: `http://host.docker.internal:8081`

If DebackX runs at another URL, edit `IIMT_WORKER_URL` in `.env` before starting Compose.
If DebackX is not running yet, the app UI still opens. The gateway health endpoint will report a degraded worker state and uploads will fail until the worker is started.

When running the frontend against this Docker backend, set:

```env
VITE_API_URL=http://localhost:8001
```

## Frontend Setup

```bash
cd FE
npm install
npm run dev
```

The frontend reads `VITE_API_URL`. Use the Docker gateway URL when running with Compose:

```env
VITE_API_URL=http://localhost:8001
```

If you run the backend directly with `uvicorn` on port `8000`, set `VITE_API_URL=http://localhost:8000` instead or leave it unset.

## Main API

- `GET /api/health`: gateway and worker health.
- `GET /api/pipeline-info`: pipeline/model metadata exposed by the gateway.
- `POST /api/upload`: multipart upload with field name `file`.
- `GET /api/jobs/{job_id}`: cached normalized job metadata.
- `GET /api/images/result/{job_id}`: final translated image.
- `GET /api/images/mask/{job_id}`: text mask image.
- `GET /api/download/result/{job_id}`: download as `jpg`, `png`, or `webp`.
- `GET /api/history`: authenticated user history.

## Notes for Graduation Project Reporting

The repo should only display measured values that come from the DebackX evaluation scripts or a final report. Keep report metrics such as BLEU, chrF, OCR CER/WER, latency, RAM/VRAM, throughput, and end-to-end quality in the thesis documentation instead of hard-coded marketing numbers.
