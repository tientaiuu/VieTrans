# VieTrans Frontend

React + Vite frontend for the VieTrans web application.

## Run Locally

```bash
npm install
npm run dev
```

Set the backend URL when needed:

```env
VITE_API_URL=
VITE_DEV_API_PROXY=http://localhost:8000
```

## Main Screens

- Studio: upload one or more images and send them to the backend gateway.
- Editor: review the translated image and make light client-side edits.
- Dashboard: view authenticated translation history.
- Docs: show the real FastAPI gateway endpoints used by the app.

The frontend does not run OCR in the browser. OCR, translation, mask generation, and rendering are delegated to the DebackX worker through the backend. User history is stored by the backend in MongoDB Atlas.

## Run With Docker Compose

From the repository root:

```bash
cp .env.docker.example .env
docker compose up --build
```

Open `http://localhost:5173`. The UI can be previewed before the DebackX worker is running; upload requests will only work after the worker is available.

For VM deployment, use the production compose file from the repository root:

```bash
cp .env.production.example .env.production
docker compose down
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The production image serves the built React app through Nginx and proxies `/api` to the backend gateway, so the frontend can be opened at `http://<server-ip>/`. The gateway then calls the remote DebackX worker configured by `IIMT_WORKER_URL`.
