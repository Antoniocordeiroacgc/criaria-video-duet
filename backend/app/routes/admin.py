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
        return {"total_users": users, "total_messages": messages}
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