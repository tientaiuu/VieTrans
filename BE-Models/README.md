# VieTrans FastAPI Gateway

This service is a lightweight gateway between the VieTrans web app and the DebackX image-translation worker.

It does not run the NLLB/PaddleOCR model stack locally. The heavy pipeline lives in DebackX and is called through `IIMT_WORKER_URL`.

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
cp server/.env.example server/.env
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

Important environment variables:

```env
IIMT_WORKER_URL=http://localhost:8081
IIMT_WORKER_TIMEOUT_SECONDS=300
VIETRANS_MAX_UPLOAD_MB=20
AUTH_ENABLED=true
```

## Docker

```bash
docker build -t vietrans-gateway .
docker run --rm -p 8000:7860 --env-file server/.env vietrans-gateway
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
- `mongo`: local MongoDB with a persistent Docker volume.

Set `IIMT_WORKER_URL` in the root `.env` to the DebackX worker URL.
