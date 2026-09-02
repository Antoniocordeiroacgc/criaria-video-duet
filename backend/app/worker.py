"""
Celery worker — processa vídeo + vídeo OU fotos + vídeo em duet.
Para fotos: converte cada imagem em vídeo com duração proporcional,
concatena tudo e então faz o split-screen com o vídeo da câmera.
"""
import logging
import subprocess
import tempfile
from pathlib import Path

from celery import Celery

from app.config import settings
from app.models import SessionLocal, RenderJob, JobStatus
from app.storage import download_to_file, upload_file
from app.video_processor import compose_duet, probe_duration_seconds, FFmpegError

logger = logging.getLogger(__name__)

celery_app = Celery("criaria_video_duet", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_soft_time_limit=600,
    task_time_limit=700,
)


def _photos_to_video(photo_paths: list[str], output_path: str, total_duration: float) -> None:
    n = len(photo_paths)
    duration_each = total_duration / n
    tmp_dir = Path(output_path).parent

    if n == 1:
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-framerate", "30",
            "-i", photo_paths[0],
            "-r", "30",
            "-t", str(total_duration),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,"
                   "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            output_path,
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            raise FFmpegError(result.stderr.decode()[-2000:])
        return

    segment_paths = []
    for i, photo_path in enumerate(photo_paths):
        seg = str(tmp_dir / f"seg_{i}.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-framerate", "30",
            "-i", photo_path,
            "-r", "30",
            "-t", str(duration_each),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,"
                   "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            seg,
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            raise FFmpegError(result.stderr.decode()[-2000:])
        segment_paths.append(seg)

    list_file = str(tmp_dir / "concat_list.txt")
    with open(list_file, "w") as f:
        for seg in segment_paths:
            f.write(f"file '{seg}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        output_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise FFmpegError(result.stderr.decode()[-2000:])

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
        cam_local = str(tmp_path / "camera.webm")
        out_local = str(tmp_path / "output.mp4")
        ref_for_compose = str(tmp_path / "reference_final.mp4")

        try:
            # Download do vídeo da câmera
            download_to_file(job.camera_video_key, cam_local)
            job.progress_pct = 20
            db.commit()

            # Obtém as chaves de referência
            ref_keys = (
                job.reference_keys_json.split(",")
                if job.reference_keys_json
                else [job.reference_video_key]
            )

            # Download dos arquivos de referência
            ref_local_paths = []
            for i, key in enumerate(ref_keys):
                ext = key.split(".")[-1]
                local = str(tmp_path / f"ref_{i}.{ext}")
                download_to_file(key, local)
                ref_local_paths.append(local)

            job.progress_pct = 40
            db.commit()

            # Se for foto(s): converte para vídeo com duração da câmera
            is_photo = getattr(job, 'reference_type', 'video') == "image"
            if is_photo:
                cam_duration = probe_duration_seconds(cam_local)
                _photos_to_video(ref_local_paths, ref_for_compose, cam_duration)
            else:
                ref_for_compose = ref_local_paths[0]

            job.progress_pct = 60
            db.commit()

            # Composição do duet
            compose_duet(
                reference_path=ref_for_compose,
                camera_path=cam_local,
                output_path=out_local,
                layout=job.layout.value if hasattr(job.layout, "value") else job.layout,
            )
            job.progress_pct = 85
            db.commit()

            # Upload do resultado
            output_key = f"outputs/{job_id}/final.mp4"
            upload_file(out_local, output_key, content_type="video/mp4")

            job.output_video_key = output_key
            job.status = JobStatus.DONE
            job.progress_pct = 100
            db.commit()

        except FFmpegError as e:
            logger.exception("Falha FFmpeg no job %s", job_id)
            job.status = JobStatus.FAILED
            job.error_message = f"Erro ao processar vídeo: {e}"
            db.commit()
        except Exception:
            logger.exception("Erro inesperado no job %s", job_id)
            job.status = JobStatus.FAILED
            job.error_message = "Erro interno ao processar o vídeo."
            db.commit()
        finally:
            db.close()
