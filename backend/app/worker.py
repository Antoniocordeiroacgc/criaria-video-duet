"""
Celery: fila assíncrona para processar vídeo fora do request HTTP.
Por que isso é obrigatório aqui: composição de vídeo demora (segundos a
minutos). Se rodasse dentro do request, o usuário ficaria com o app
"travado" esperando resposta e você arriscaria timeout do load balancer.
"""
import logging
import tempfile
from pathlib import Path

from celery import Celery

from app.config import settings
from app.models import SessionLocal, RenderJob, JobStatus
from app.storage import download_to_file, upload_file
from app.video_processor import compose_duet, FFmpegError

logger = logging.getLogger(__name__)

celery_app = Celery("criaria_video_duet", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,  # 1 vídeo pesado por worker por vez
    task_acks_late=True,
)


@celery_app.task(name="process_duet_job", bind=True, max_retries=1)
def process_duet_job(self, job_id: str):
    db = SessionLocal()
    job = db.get(RenderJob, job_id)
    if not job:
        logger.error("Job %s não encontrado", job_id)
        db.close()
        return

    job.status = JobStatus.PROCESSING
    job.progress_pct = 10
    db.commit()

    with tempfile.TemporaryDirectory(prefix=f"duet_{job_id}_") as tmp:
        tmp_path = Path(tmp)
        ref_local = str(tmp_path / "reference.mp4")
        cam_local = str(tmp_path / "camera.webm")
        out_local = str(tmp_path / "output.mp4")

        try:
            download_to_file(job.reference_video_key, ref_local)
            download_to_file(job.camera_video_key, cam_local)
            job.progress_pct = 40
            db.commit()

            compose_duet(
                reference_path=ref_local,
                camera_path=cam_local,
                output_path=out_local,
                layout=job.layout.value if hasattr(job.layout, "value") else job.layout,
            )
            job.progress_pct = 80
            db.commit()

            output_key = f"outputs/{job_id}/final.mp4"
            upload_file(out_local, output_key, content_type="video/mp4")

            job.output_video_key = output_key
            job.status = JobStatus.DONE
            job.progress_pct = 100
            db.commit()

        except FFmpegError as e:
            logger.exception("Falha de FFmpeg no job %s", job_id)
            job.status = JobStatus.FAILED
            job.error_message = f"Erro ao processar vídeo: {e}"
            db.commit()
        except Exception as e:
            logger.exception("Erro inesperado no job %s", job_id)
            job.status = JobStatus.FAILED
            job.error_message = "Erro interno ao processar o vídeo."
            db.commit()
        finally:
            db.close()
