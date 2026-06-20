"""
Modelos de banco de dados (SQLAlchemy 2.0).
Apenas metadados de jobs — os arquivos de vídeo em si vivem no object storage.
"""
import enum
import uuid
from datetime import datetime, timedelta

from sqlalchemy import String, Enum, DateTime, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class Layout(str, enum.Enum):
    TOP_BOTTOM = "top_bottom"
    SIDE_BY_SIDE = "side_by_side"


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.PENDING, index=True)
    layout: Mapped[Layout] = mapped_column(Enum(Layout), default=Layout.TOP_BOTTOM)

    reference_video_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    camera_video_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    output_video_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress_pct: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(hours=settings.JOB_RETENTION_HOURS)
    )


engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
