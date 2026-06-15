## Project Context

React + Vite frontend for VieTrans. The app calls the FastAPI gateway in `BE-Models`, and that gateway calls the DebackX worker for image translation.

## Stack

- React
- TypeScript
- Vite
- Zustand
- React Router
- Tailwind/CSS variables

## Commands

```bash
npm run dev
npm run build
npm run lint
```

## Architecture

- `src/api.ts`: client for the FastAPI gateway.
- `src/features/studio`: upload queue, comparison view, and editor.
- `src/features/dashboard`: authenticated translation history.
- `src/features/account`: profile/history/settings/project information.
- `src/features/docs`: gateway API documentation.

## Boundaries

- Do not add browser OCR or local model inference here; DebackX handles OCR, translation, masking, and rendering.
- Keep UI text aligned with measured project results, not hard-coded marketing metrics.
- Do not commit `.env` files or generated build output.
