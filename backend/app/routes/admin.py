"""
Rotas do dashboard admin — protegidas por senha.
"""
import logging
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy import text
from app.models import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_PASSWORD = "criar@1530"


def _check_auth(x_admin_password: str = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Senha incorreta.")


@router.get("/stats")
def get_stats(x_admin_password: str = Header(None)):
    _check_auth(x_admin_password)
    db = SessionLocal()
    try:
        users = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
        messages = db.execute(text("SELECT COUNT(*) FROM contact_messages")).fetchone()[0]
        jobs_total = db.execute(text("SELECT COUNT(*) FROM render_jobs")).fetchone()[0]
        jobs_done = db.execute(text("SELECT COUNT(*) FROM render_jobs WHERE status = 'done'")).fetchone()[0]
        jobs_failed = db.execute(text("SELECT COUNT(*) FROM render_jobs WHERE status = 'failed'")).fetchone()[0]
        return {
            "total_users": users,
            "total_messages": messages,
            "total_jobs": jobs_total,
            "jobs_done": jobs_done,
            "jobs_failed": jobs_failed,
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
            "id": r[0],
            "status": r[1],
            "layout": r[2],
            "reference_type": r[3],
            "reference_count": r[4],
            "progress_pct": r[5],
            "error_message": r[6],
            "created_at": str(r[7]),
            "updated_at": str(r[8]),
        } for r in rows]
    finally:
        db.close()
