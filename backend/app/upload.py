"""
Rotas da API — suporte a vídeo OU fotos (carrossel) como referência + música de fundo.
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
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a"}


def _base_type(content_type: str) -> str:
    return (content_type or "").split(";")[0].strip()


def _get_file_type(file: UploadFile) -> str:
    bt = _base_type(file.content_type)
    if bt in ALLOWED_VIDEO_TYPES:
        return "video"
    if bt in ALLOWED_IMAGE_TYPES:
        return "image"
    raise HTTPException(status_code=415, detail=f"Tipo não suportado: {file.content_type}.")


@router.post("", status_code=201)
async def create_duet_job(
    reference_video: UploadFile = File(...),
    camera_video: UploadFile = File(...),
    reference_photos: list[UploadFile] = File(default=[]),
    music_file: UploadFile = File(default=None),
    layout: str = Form(default="top_bottom"),
    photo_timestamps: str | None = Form(default=None),
    ref_start_timestamp: float | None = Form(default=None),
    db: Session = Depends(get_db),
):
    if layout not in (Layout.TOP_BOTTOM.value, Layout.SIDE_BY_SIDE.value):
        raise HTTPException(status_code=400, detail="Layout inválido.")

    ref_type = _get_file_type(reference_video)
    cam_base = _base_type(camera_video.content_type)
    if cam_base not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=415, detail=f"Câmera: tipo não suportado.")

    if ref_type == "video" and reference_photos:
        raise HTTPException(status_code=400, detail="Não misture vídeo e fotos.")

    for photo in reference_photos:
        if _get_file_type(photo) != "image":
            raise HTTPException(status_code=415, detail="Todos os arquivos de referência devem ser imagens.")

    all_ref_files = [reference_video] + list(reference_photos)
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024

    job = RenderJob(layout=Layout(layout), status=JobStatus.UPLOADING)
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        ref_keys = []
        for i, upload_obj in enumerate(all_ref_files):
            upload_obj.file.seek(0, 2)
            size = upload_obj.file.tell()
            upload_obj.file.seek(0)
            if size > max_bytes:
                raise HTTPException(status_code=413, detail=f"Arquivo excede {settings.MAX_UPLOAD_MB}MB.")
            fname = upload_obj.filename or ""
            ext = fname.split(".")[-1] if "." in fname else ("mp4" if ref_type == "video" else "jpg")
            key = f"uploads/raw/{job.id}/reference_{i}.{ext}"
            upload_fileobj(upload_obj.file, key, content_type=upload_obj.content_type)
            ref_keys.append(key)

        camera_video.file.seek(0, 2)
        size = camera_video.file.tell()
        camera_video.file.seek(0)
        if size > max_bytes:
            raise HTTPException(status_code=413, detail=f"Arquivo excede {settings.MAX_UPLOAD_MB}MB.")

        cam_key = f"uploads/raw/{job.id}/camera.webm"
        upload_fileobj(camera_video.file, cam_key, content_type=camera_video.content_type)

        # Upload da música se fornecida
        music_key = None
        if music_file and music_file.filename:
            music_type = _base_type(music_file.content_type)
            if music_type in ALLOWED_AUDIO_TYPES or music_type.startswith("audio/"):
                fname = music_file.filename or "music.mp3"
                ext = fname.split(".")[-1] if "." in fname else "mp3"
                music_key = f"uploads/raw/{job.id}/music.{ext}"
                upload_fileobj(music_file.file, music_key, content_type=music_file.content_type)

        job.reference_video_key = ref_keys[0]
        job.reference_keys_json = ",".join(ref_keys)
        job.reference_type = ref_type
        job.reference_count = len(ref_keys)
        job.camera_video_key = cam_key
        job.music_file_key = music_key
        job.photo_timestamps = photo_timestamps
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
    return {"job_id": job.id, "status": job.status.value, "progress_pct": job.progress_pct, "error_message": job.error_message}


@router.get("/{job_id}/download")
def get_download_url(job_id: str, db: Session = Depends(get_db)):
    job = db.get(RenderJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    if job.status != JobStatus.DONE or not job.output_video_key:
        raise HTTPException(status_code=409, detail="Vídeo ainda não está pronto.")
    url = generate_presigned_url(job.output_video_key, expires_in=3600, download_filename=f"duovideo-{job.id[:8]}.mp4")
    return {"download_url": url, "expires_in": 3600}


@router.get("/{job_id}/file")
def download_file(job_id: str, db: Session = Depends(get_db)):
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
    return StreamingResponse(s3_response["Body"].iter_chunks(chunk_size=1024 * 1024), media_type="video/mp4", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
