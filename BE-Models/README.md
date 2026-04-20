---
title: VieTrans API
emoji: 🦀
colorFrom: indigo
colorTo: slate
sdk: docker
app_port: 7860
pinned: false
---

# VieTrans Backend API

This is the FastAPI backend for the VieTrans Image Translation project.

## How to run locally
1. Install dependencies: `pip install -r server/requirements.txt`
2. Run server: `cd server && uvicorn app:app --reload`

## Deployment
Deployed using a Docker container on Hugging Face Spaces.
