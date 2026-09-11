"""
Rotas de cadastro de usuários e fale conosco.
"""
import logging
import httpx

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.models import get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: str


class ContactMessage(BaseModel):
    name: str
    email: str
    message: str


def _ensure_users_table(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS contact_messages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    db.commit()


@router.post("/users", status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    _ensure_users_table(db)

    name = user.name.strip()
    email = user.email.strip().lower()

    if not name or not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Nome e email válido são obrigatórios.")

    # Verifica se já existe
    result = db.execute(text("SELECT id, name FROM users WHERE email = :email"), {"email": email}).fetchone()
    if result:
        return {"id": result[0], "name": result[1], "email": email, "existing": True}

    result = db.execute(
        text("INSERT INTO users (name, email) VALUES (:name, :email) RETURNING id"),
        {"name": name, "email": email}
    ).fetchone()
    db.commit()

    return {"id": result[0], "name": name, "email": email, "existing": False}


@router.get("/users/count")
def get_users_count(db: Session = Depends(get_db)):
    _ensure_users_table(db)
    result = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()
    return {"total": result[0]}


@router.post("/contact", status_code=201)
async def send_contact(msg: ContactMessage, db: Session = Depends(get_db)):
    _ensure_users_table(db)

    name = msg.name.strip()
    email = msg.email.strip().lower()
    message = msg.message.strip()

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Todos os campos são obrigatórios.")

    # Salva no banco
    db.execute(
        text("INSERT INTO contact_messages (name, email, message) VALUES (:name, :email, :message)"),
        {"name": name, "email": email, "message": message}
    )
    db.commit()

    # Envia email via Resend
    resend_key = getattr(settings, 'RESEND_API_KEY', None)
    if resend_key:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                    json={
                        "from": "DuoVideo <onboarding@resend.dev>",
                        "to": ["criaraislz@gmail.com"],
                        "subject": f"[DuoVideo] Mensagem de {name}",
                        "html": f"""
                            <h2>Nova mensagem via Fale Conosco</h2>
                            <p><strong>Nome:</strong> {name}</p>
                            <p><strong>Email:</strong> {email}</p>
                            <p><strong>Mensagem:</strong></p>
                            <p>{message}</p>
                            <hr>
                            <small>Enviado via DuoVideo — CRIAR.IA TECNOLOGIA</small>
                        """,
                    },
                    timeout=10,
                )
        except Exception as e:
            logger.warning("Falha ao enviar email: %s", e)

    return {"ok": True}
