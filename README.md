# VieTrans Web Gateway for DebackX

VieTrans is the web application that calls the DebackX image-translation worker. The web app stays lightweight: it handles upload UI, authentication, history, downloads, and API proxying, while OCR, NLLB translation, masking, and rendering run in the DebackX worker service on a separate machine.

## Project Structure

- `FE/`: React + Vite frontend with studio upload, batch queue, editor, dashboard, auth, and API docs.
- `BE-Models/`: FastAPI gateway. It no longer contains the heavy model runtime; it forwards work to DebackX through `IIMT_WORKER_URL`.

## Runtime Architecture

1. User uploads an image from the Studio or calls `POST /api/upload`.
2. VieTrans backend validates the file and forwards it to the DebackX worker.
3. DebackX runs PaddleOCR, the fine-tuned NLLB 1.3B translation model, mask generation, and rendering.
4. VieTrans normalizes the result and exposes `input`, `result`, `mask`, and `metadata` URLs to the frontend.
5. If the request includes a valid user token, the result is saved to MongoDB Atlas history.

## Backend Setup

```bash
cd BE-Models
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set the environment variables in your shell or copy the root `.env.docker.example` to `.env` when using Docker:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority&appName=<app-name>
MONGO_DB=vietrans
FRONTEND_BASE_URL=http://localhost:5173
IIMT_WORKER_URL=https://debackx-worker.example.com
IIMT_WORKER_TIMEOUT_SECONDS=300
IIMT_WORKER_MODE=async
IIMT_WORKER_API_KEY=
VIETRANS_MAX_UPLOAD_MB=20
```

Run the gateway:

```bash
cd BE-Models
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

## Docker Environment

Use Docker Compose when you want the web backend to run in an isolated local environment while using MongoDB Atlas:

```bash
cd /home/yusato/workspace/new-Vie
cp .env.docker.example .env
docker compose up --build
```

Default services:

- VieTrans frontend: `http://localhost:5173`
- VieTrans gateway: `http://localhost:8001`
- MongoDB: configured by `MONGO_URI` and expected to be MongoDB Atlas
- DebackX worker: configured by `IIMT_WORKER_URL`

If DebackX is not running yet, the app UI still opens. The gateway health endpoint will report a degraded worker state and uploads will fail until the worker is started. If Atlas is not reachable, auth/history is disabled and health shows `auth_ready: false`.

The local Vite container proxies `/api` to the gateway inside Docker, so the browser does not need to call `localhost:8001` directly. Keep this value empty unless you intentionally want the frontend to call a separate API origin:

```env
VITE_API_URL=
```

## Production Docker Deploy

For a VM deploy behind Cloudflare Tunnel, use the production compose file. It builds the React app into static files, serves it through Nginx, proxies `/api` to the FastAPI gateway, and keeps gateway/Mongo off the public network.

```bash
cd /home/yusato/workspace/new-Vie
cp .env.production.example .env.production
# edit SECRET_KEY, MONGO_URI, FRONTEND_BASE_URL, IIMT_WORKER_URL, and optionally IIMT_WORKER_API_KEY
docker compose down
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Default local production port:

- Web app and API through Nginx: `http://localhost:8080/`
- Health check: `http://localhost:8080/api/health`

No router port forwarding or public inbound port is required when using Cloudflare Tunnel. The production web container binds only to `127.0.0.1:${LOCAL_WEB_PORT:-8080}` on the VM.

To run the Cloudflare connector inside the same Docker network, set `CLOUDFLARE_TUNNEL_TOKEN` and start the `cloudflare` profile:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile cloudflare up -d --build
```

In Cloudflare Zero Trust, configure the public hostname:

```text
yusatothesis.id.vn -> http://web:80
www.yusatothesis.id.vn -> http://web:80
```

If you run `cloudflared` directly on the VM instead of Compose, configure the service as `http://localhost:8080`.

MongoDB Atlas must allow inbound access from the web VM or allow trusted network access. The DebackX worker can run on a different GPU host; set `IIMT_WORKER_URL` to that worker's API URL and use the same `IIMT_WORKER_API_KEY` on both sides if the worker is public.

## Frontend Setup

```bash
cd FE
npm install
npm run dev
```

The frontend reads `VITE_API_URL`. Use the Docker gateway URL when running with Compose:

```env
VITE_API_URL=
VITE_DEV_API_PROXY=http://localhost:8000
```

If you run the backend directly with `uvicorn` on port `8000`, leave `VITE_API_URL` empty and let the Vite dev proxy forward `/api` to `VITE_DEV_API_PROXY`.

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
