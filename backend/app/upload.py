"""
Rotas da API que o frontend React consome.

Fluxo:
  1. POST /jobs                  -> cria o job, recebe os dois arquivos
  2. GET  /jobs/{job_id}          -> consulta status/progresso (polling)
  3. GET  /jobs/{job_id}/download -> retorna URL assinada do vídeo final
"""
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.models import get_db, RenderJob, JobStatus, Layout
from app.storage import upload_fileobj, generate_presigned_url
from app.worker import process_duet_job

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}


def _validate_video(file: UploadFile):
    # Navegadores enviam o content_type com parâmetros extras de codec,
    # ex.: "video/webm;codecs=vp8,opus" — pegamos só a parte antes do ";"
    # para comparar com a lista de tipos permitidos.
    base_type = (file.content_type or "").split(";")[0].strip()
    if base_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de arquivo não suportado: {file.content_type}",
        )


@router.post("", status_code=201)
async def create_duet_job(
    reference_video: UploadFile = File(..., description="Vídeo de referência"),
    camera_video: UploadFile = File(..., description="Vídeo gravado pela câmera do usuário"),
    layout: str = Form(default="top_bottom"),
    db: Session = Depends(get_db),
):
    _validate_video(reference_video)
    _validate_video(camera_video)

    if layout not in (Layout.TOP_BOTTOM.value, Layout.SIDE_BY_SIDE.value):
        raise HTTPException(status_code=400, detail="Layout inválido. Use 'top_bottom' ou 'side_by_side'.")

    # Limite de tamanho — lê em streaming, não carrega tudo em memória de uma vez
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024

    job = RenderJob(layout=Layout(layout), status=JobStatus.UPLOADING)
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        ref_key = f"uploads/raw/{job.id}/reference.mp4"
        cam_key = f"uploads/raw/{job.id}/camera.webm"

        for upload_obj, key in ((reference_video, ref_key), (camera_video, cam_key)):
            upload_obj.file.seek(0, 2)
            size = upload_obj.file.tell()
            upload_obj.file.seek(0)
            if size > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"Arquivo excede o limite de {settings.MAX_UPLOAD_MB}MB.",
                )
            upload_fileobj(upload_obj.file, key, content_type=upload_obj.content_type)

        job.reference_video_key = ref_key
        job.camera_video_key = cam_key
        job.status = JobStatus.PENDING
        db.commit()

    except HTTPException:
        job.status = JobStatus.FAILED
        db.commit()
        raise
    except Exception:
        logger.exception("Falha no upload do job %s", job.id)
        job.status = JobStatus.FAILED
        job.error_message = "Falha ao enviar arquivos para o storage."
        db.commit()
        raise HTTPException(status_code=500, detail="Falha ao processar upload.")

    # Dispara o processamento assíncrono (não bloqueia a resposta HTTP)
    process_duet_job.delay(job.id)

    return {"job_id": job.id, "status": job.status.value}


@router.get("/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return {
        "job_id": job.id,
        "status": job.status.value,
        "progress_pct": job.progress_pct,
        "error_message": job.error_message,
    }


@router.get("/{job_id}/download")
def get_download_url(job_id: str, db: Session = Depends(get_db)):
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    if job.status != JobStatus.DONE or not job.output_video_key:
        raise HTTPException(status_code=409, detail="Vídeo ainda não está pronto.")

    url = generate_presigned_url(
        job.output_video_key,
        expires_in=3600,
        download_filename=f"criaria-duet-{job.id[:8]}.mp4",
    )
    return {"download_url": url, "expires_in": 3600}
