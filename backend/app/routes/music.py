"""
Rota pública para galeria de músicas.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from app.models import SessionLocal
from app.storage import get_s3_client
from app.config import settings

router = APIRouter(prefix="/music", tags=["music"])


@router.get("")
def list_music():
    db = SessionLocal()
    try:
        rows = db.execute(text(
            "SELECT id, title, artist, genre, file_key, duration_seconds FROM music_tracks ORDER BY title"
        )).fetchall()
        return [{"id": r[0], "title": r[1], "artist": r[2], "genre": r[3], "file_key": r[4], "duration_seconds": r[5]} for r in rows]
    except Exception:
        return []
    finally:
        db.close()


@router.get("/{music_id}/stream")
def stream_music(music_id: int):
    db = SessionLocal()
    try:
        row = db.execute(text("SELECT file_key FROM music_tracks WHERE id = :id"), {"id": music_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Música não encontrada.")
        file_key = row[0]
    finally:
        db.close()

    client = get_s3_client()
    try:
        s3_response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Falha ao buscar música.")

    return StreamingResponse(
        s3_response["Body"].iter_chunks(chunk_size=1024 * 64),
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes"},
    )
