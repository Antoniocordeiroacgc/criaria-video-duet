"""
Configuração central do backend CRIAR.IA — Video Duet.
Tudo vem de variáveis de ambiente (.env). Nada de credenciais hardcoded.
"""
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "CRIAR.IA Video Duet API"
    ENV: str = Field(default="development")
    MAX_UPLOAD_MB: int = Field(default=300)  # limite de tamanho por vídeo
    MAX_VIDEO_DURATION_SECONDS: int = Field(default=180)  # 3 min, evita abuso

    # --- Banco de dados (Postgres) ---
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://criaria:criaria@localhost:5432/criaria_duet"
    )

    # --- Storage (S3-compatible: Cloudflare R2, AWS S3, DigitalOcean Spaces) ---
    S3_ENDPOINT_URL: str = Field(default="")  # vazio = AWS S3 padrão
    S3_ACCESS_KEY_ID: str = Field(default="")
    S3_SECRET_ACCESS_KEY: str = Field(default="")
    S3_BUCKET_NAME: str = Field(default="criaria-video-duet")
    S3_REGION: str = Field(default="auto")
    S3_PUBLIC_BASE_URL: str = Field(default="")  # CDN/domínio público do bucket

    # --- Marca d'água ---
    WATERMARK_TEXT: str = Field(default="CRIAR.IA TECNOLOGIA | criarhub.com")
    WATERMARK_PATH: str = Field(default="")  # caminho de um PNG de logo, opcional

    # --- Fila assíncrona (Redis + Celery) ---
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # --- Limpeza automática ---
    JOB_RETENTION_HOURS: int = Field(default=168)  # 7 dias

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
