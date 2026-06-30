---
title: VieTrans API
emoji: 🦀
colorFrom: indigo
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# VieTrans Backend API

This is the FastAPI backend for the VieTrans Image Translation project.
It is an API/auth/history proxy only; model inference runs in the separate
Hugging Face Space configured by `VIETRANS_SPACE_URL`.

## How to run locally
1. Install dependencies: `pip install -r server/requirements.txt`
2. Optional: set `VIETRANS_SPACE_URL` if you are not using the default Space.
3. Run server: `cd server && uvicorn app:app --reload`

## Deployment
Deployed using a Docker container on Hugging Face Spaces.
