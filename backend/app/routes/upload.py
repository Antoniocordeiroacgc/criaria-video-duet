"""
Rotas da API — suporte a vídeo OU fotos (carrossel) como referência.

Fluxo:
  1. POST /jobs  → recebe reference_files (vídeo OU fotos) + camera_video
  2. GET  /jobs/{job_id}         → status/progresso
  3. GET  /jobs/{job_id}/download → URL assinada
  4. GET  /jobs/{job_id}/file    → download direto via backend
"""
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.models import get_db, RenderJob, JobStatus, Layout
from app.storage import upload_fileobj, generate_presigned_url, get_s3_client
from app.worker import process_duet_job

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _base_type(content_type: str) -> str:
    return (content_type or "").split(";")[0].strip()


def _get_file_type(file: UploadFile) -> str:
    """Retorna 'video' ou 'image' ou lança 415."""
    bt = _base_type(file.content_type)
    if bt in ALLOWED_VIDEO_TYPES:
        return "video"
    if bt in ALLOWED_IMAGE_TYPES:
        return "image"
    raise HTTPException(
        status_code=415,
        detail=f"Tipo não suportado: {file.content_type}. Use vídeo ou imagem (JPEG/PNG/WebP).",
    )


@router.post("", status_code=201)
async def create_duet_job(
    reference_video: UploadFile = File(..., description="Vídeo OU primeira foto de referência"),
    camera_video: UploadFile = File(..., description="Vídeo gravado pela câmera"),
    reference_photos: list[UploadFile] = File(default=[], description="Fotos adicionais do carrossel"),
    layout: str = Form(default="top_bottom"),
    db: Session = Depends(get_db),
):
    if layout not in (Layout.TOP_BOTTOM.value, Layout.SIDE_BY_SIDE.value):
        raise HTTPException(status_code=400, detail="Layout inválido.")

    # Valida tipos
    ref_type = _get_file_type(reference_video)
    cam_base = _base_type(camera_video.content_type)
    if cam_base not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=415, detail=f"Câmera: tipo não suportado: {camera_video.content_type}")

    # Monta lista completa de arquivos de referência
    all_ref_files = [reference_video] + list(reference_photos)

    # Se é vídeo, não pode ter fotos junto
    if ref_type == "video" and reference_photos:
        raise HTTPException(status_code=400, detail="Não misture vídeo e fotos na referência.")

    # Valida que todas as fotos adicionais são imagens
    for photo in reference_photos:
        if _get_file_type(photo) != "image":
            raise HTTPException(status_code=415, detail="Todos os arquivos de referência devem ser imagens.")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024

    job = RenderJob(layout=Layout(layout), status=JobStatus.UPLOADING)
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # Upload dos arquivos de referência
        ref_keys = []
        for i, upload_obj in enumerate(all_ref_files):
            upload_obj.file.seek(0, 2)
            size = upload_obj.file.tell()
            upload_obj.file.seek(0)
            if size > max_bytes:
                raise HTTPException(status_code=413, detail=f"Arquivo excede {settings.MAX_UPLOAD_MB}MB.")

            # Determina extensão
            fname = upload_obj.filename or ""
            ext = fname.split(".")[-1] if "." in fname else (
                "mp4" if ref_type == "video" else "jpg"
            )
            key = f"uploads/raw/{job.id}/reference_{i}.{ext}"
            upload_fileobj(upload_obj.file, key, content_type=upload_obj.content_type)
            ref_keys.append(key)

        # Upload do vídeo da câmera
        camera_video.file.seek(0, 2)
        size = camera_video.file.tell()
        camera_video.file.seek(0)
        if size > max_bytes:
            raise HTTPException(status_code=413, detail=f"Arquivo excede {settings.MAX_UPLOAD_MB}MB.")

        cam_key = f"uploads/raw/{job.id}/camera.webm"
        upload_fileobj(camera_video.file, cam_key, content_type=camera_video.content_type)

        # Salva no job
        job.reference_video_key = ref_keys[0]
        job.reference_keys_json = ",".join(ref_keys)
        job.reference_type = ref_type
        job.reference_count = len(ref_keys)
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
        download_filename=f"duovideo-{job.id[:8]}.mp4",
    )
    return {"download_url": url, "expires_in": 3600}


@router.get("/{job_id}/file")
def download_file(job_id: str, db: Session = Depends(get_db)):
    """Download direto via backend — funciona mesmo com MinIO local."""
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    if job.status != JobStatus.DONE or not job.output_video_key:
        raise HTTPException(status_code=409, detail="Vídeo ainda não está pronto.")

    client = get_s3_client()
    try:
        s3_response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=job.output_video_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Falha ao buscar o arquivo no storage.")

    filename = f"duovideo-{job.id[:8]}.mp4"
    return StreamingResponse(
        s3_response["Body"].iter_chunks(chunk_size=1024 * 1024),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
