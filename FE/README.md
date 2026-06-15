# VieTrans Frontend

React + Vite frontend for the VieTrans web application.

## Run Locally

```bash
npm install
npm run dev
```

Set the backend URL when needed:

```env
VITE_API_URL=http://localhost:8000
```

## Main Screens

- Studio: upload one or more images and send them to the backend gateway.
- Editor: review the translated image and make light client-side edits.
- Dashboard: view authenticated translation history.
- Docs: show the real FastAPI gateway endpoints used by the app.

The frontend does not run OCR in the browser. OCR, translation, mask generation, and rendering are delegated to the DebackX worker through the backend.

## Run With Docker Compose

From the repository root:

```bash
cp .env.docker.example .env
docker compose up --build
```

Open `http://localhost:5173`. The UI can be previewed before the DebackX worker is running; upload requests will only work after the worker is available.
