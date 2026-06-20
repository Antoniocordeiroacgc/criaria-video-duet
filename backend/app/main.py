"""
Entry point da API CRIAR.IA Video Duet.

Rodar localmente:
  uvicorn app.main:app --reload --port 8000

Rodar o worker (em outro terminal/processo):
  celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import init_db
from app.routes import upload

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.APP_NAME)

# CORS: ajuste allow_origins para o domínio real em produção (não usar "*" com credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO produção: ["https://criarhub.com", "https://app.criarhub.com"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
