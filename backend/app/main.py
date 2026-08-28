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
from app.storage import get_s3_client

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
    _ensure_bucket_exists()


def _ensure_bucket_exists():
    """Cria o bucket automaticamente se ele não existir (essencial em dev com MinIO)."""
    try:
        client = get_s3_client()
        existing = [b["Name"] for b in client.list_buckets().get("Buckets", [])]
        if settings.S3_BUCKET_NAME not in existing:
            client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
            logging.info("Bucket '%s' criado automaticamente.", settings.S3_BUCKET_NAME)
    except Exception:
        logging.exception("Não foi possível verificar/criar o bucket no storage.")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
