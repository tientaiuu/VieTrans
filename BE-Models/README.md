# VieTrans FastAPI Gateway

This service is a lightweight gateway between the VieTrans web app and the DebackX image-translation worker.

It does not run the NLLB/PaddleOCR model stack locally. The heavy pipeline lives in DebackX on a GPU host and is called through `IIMT_WORKER_URL`. Auth/history uses MongoDB Atlas through `MONGO_URI`.

## Responsibilities

- Accept image uploads from the frontend.
- Forward uploads to the DebackX `/translate` endpoint.
- Normalize OCR, translation, region, latency, and output image metadata.
- Proxy worker image assets through stable frontend URLs.
- Save authenticated user history to MongoDB.

## Local Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

Important environment variables:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority&appName=<app-name>
MONGO_DB=vietrans
FRONTEND_BASE_URL=http://localhost:5173
IIMT_WORKER_URL=https://debackx-worker.example.com
IIMT_WORKER_TIMEOUT_SECONDS=300
IIMT_WORKER_MODE=async
IIMT_WORKER_API_KEY=
VIETRANS_MAX_UPLOAD_MB=20
AUTH_ENABLED=true
```

## Docker

```bash
docker build -t vietrans-gateway .
docker run --rm -p 8000:7860 --env-file ../.env vietrans-gateway
```

The Docker image installs only gateway dependencies. Deploy DebackX separately on the machine or service that has the model runtime.

For the recommended isolated local environment, run from the repository root:

```bash
cp .env.docker.example .env
docker compose up --build
```

This starts:

- `frontend`: Vite dev server on `localhost:5173`.
- `gateway`: FastAPI gateway on `localhost:8001`.

Set `MONGO_URI` to MongoDB Atlas and `IIMT_WORKER_URL` to the DebackX worker URL.

For VM deployment, prefer the production compose file from the repository root:

```bash
cp .env.production.example .env.production
docker compose down
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

That setup serves the app locally through Nginx on `LOCAL_WEB_PORT` and routes `/api` to this gateway internally. For Cloudflare Tunnel, run the `cloudflare` compose profile and point the public hostname to `http://web:80`.
