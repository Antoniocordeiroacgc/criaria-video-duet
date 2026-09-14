"""
Rotas do dashboard admin — protegidas por senha.
"""
import logging
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from sqlalchemy import text
from app.models import SessionLocal
from app.config import settings
from app.storage import upload_fileobj, get_s3_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def _check_auth(x_admin_password: str = Header(None)):
    if x_admin_password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Senha incorreta.")


@router.get("/stats")
def get_stats(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        users = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
        messages = db.execute(text("SELECT COUNT(*) FROM contact_messages")).fetchone()[0]
        jobs_total = db.execute(text("SELECT COUNT(*) FROM render_jobs")).fetchone()[0]
        jobs_done = db.execute(text("SELECT COUNT(*) FROM render_jobs WHERE LOWER(status::text) = 'done'")).fetchone()[0]
        jobs_failed = db.execute(text("SELECT COUNT(*) FROM render_jobs WHERE LOWER(status::text) = 'failed'")).fetchone()[0]
        try:
            music_total = db.execute(text("SELECT COUNT(*) FROM music_tracks")).fetchone()[0]
        except Exception:
            music_total = 0
        return {
            "total_users": users,
            "total_messages": messages,
            "total_jobs": jobs_total,
            "jobs_done": jobs_done,
            "jobs_failed": jobs_failed,
            "total_music": music_total,
        }
    finally:
        db.close()


@router.get("/users")
def list_users(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC")).fetchall()
        return [{"id": r[0], "name": r[1], "email": r[2], "created_at": str(r[3])} for r in rows]
    finally:
        db.close()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.get("/messages")
def list_messages(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT id, name, email, message, created_at FROM contact_messages ORDER BY created_at DESC")).fetchall()
        return [{"id": r[0], "name": r[1], "email": r[2], "message": r[3], "created_at": str(r[4])} for r in rows]
    finally:
        db.close()


@router.delete("/messages/{msg_id}")
def delete_message(msg_id: int, x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM contact_messages WHERE id = :id"), {"id": msg_id})
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM render_jobs WHERE id = :id"), {"id": job_id})
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.get("/jobs")
def list_jobs(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT id, status, layout, reference_type, reference_count,
                   progress_pct, error_message, created_at, updated_at
            FROM render_jobs
            ORDER BY created_at DESC
            LIMIT 100
        """)).fetchall()
        return [{
            "id": r[0], "status": r[1], "layout": r[2],
            "reference_type": r[3], "reference_count": r[4],
            "progress_pct": r[5], "error_message": r[6],
            "created_at": str(r[7]), "updated_at": str(r[8]),
        } for r in rows]
    finally:
        db.close()


# ── Galeria de Músicas ──

def _ensure_music_table(db):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS music_tracks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            artist VARCHAR(255),
            genre VARCHAR(100),
            file_key VARCHAR(512) NOT NULL,
            duration_seconds INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    db.commit()


@router.get("/music")
def list_music(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        _ensure_music_table(db)
        rows = db.execute(text("SELECT id, title, artist, genre, file_key, duration_seconds, created_at FROM music_tracks ORDER BY created_at DESC")).fetchall()
        return [{"id": r[0], "title": r[1], "artist": r[2], "genre": r[3], "file_key": r[4], "duration_seconds": r[5], "created_at": str(r[6])} for r in rows]
    finally:
        db.close()


@router.post("/music", status_code=201)
async def upload_music(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form(default=""),
    genre: str = Form(default=""),
    x_admin_password: str = Header(None),
):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        _ensure_music_table(db)
        fname = file.filename or "music.mp3"
        ext = fname.split(".")[-1] if "." in fname else "mp3"
        import uuid
        file_key = f"music/{uuid.uuid4()}.{ext}"
        upload_fileobj(file.file, file_key, content_type=file.content_type or "audio/mpeg")

        result = db.execute(text(
            "INSERT INTO music_tracks (title, artist, genre, file_key) VALUES (:title, :artist, :genre, :file_key) RETURNING id"
        ), {"title": title, "artist": artist, "genre": genre, "file_key": file_key}).fetchone()
        db.commit()
        return {"id": result[0], "title": title, "file_key": file_key}
    finally:
        db.close()


@router.delete("/music/{music_id}")
def delete_music(music_id: int, x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM music_tracks WHERE id = :id"), {"id": music_id})
        db.commit()
        return {"ok": True}
    finally:
        db.close()
