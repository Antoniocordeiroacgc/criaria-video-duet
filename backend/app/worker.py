"""
Celery worker — processa vídeo + vídeo OU fotos (carrossel sincronizado) em duet.
"""
import json
import logging
import subprocess
import tempfile
from pathlib import Path

from celery import Celery

from app.config import settings
from app.models import SessionLocal, RenderJob, JobStatus
from app.storage import download_to_file, upload_file
from app.video_processor import compose_duet, probe_duration_seconds, FFmpegError, _convert_to_mp4

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


def _photos_to_video_synced(
    photo_paths: list[str],
    output_path: str,
    total_duration: float,
    timestamps: list[dict] | None = None,
) -> None:
    """
    Converte fotos em vídeo usando timestamps do carrossel para sincronização.

    timestamps: [{ "photoIndex": 0, "startTime": 0 }, { "photoIndex": 1, "startTime": 5.3 }, ...]
    Se não houver timestamps, divide igualmente.
    """
    n = len(photo_paths)
    tmp_dir = Path(output_path).parent

    # Calcula duração de cada foto
    if timestamps and len(timestamps) > 0:
        # Usa timestamps reais do carrossel
        durations = []
        sorted_ts = sorted(timestamps, key=lambda x: x['startTime'])

        for i, ts in enumerate(sorted_ts):
            photo_idx = ts['photoIndex']
            start = ts['startTime']
            end = sorted_ts[i + 1]['startTime'] if i + 1 < len(sorted_ts) else total_duration
            duration = max(0.5, end - start)  # mínimo 0.5s por foto
            durations.append((photo_idx, duration))
    else:
        # Divide igualmente
        duration_each = total_duration / n
        durations = [(i, duration_each) for i in range(n)]

    # Gera segmento para cada foto
    segment_paths = []
    for seg_idx, (photo_idx, duration) in enumerate(durations):
        photo_path = photo_paths[min(photo_idx, n - 1)]
        seg = str(tmp_dir / f"seg_{seg_idx}.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-threads", "2",
            "-loop", "1",
            "-framerate", "30",
            "-i", photo_path,
            "-r", "30",
            "-t", str(duration),
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

    if len(segment_paths) == 1:
        import shutil
        shutil.copy(segment_paths[0], output_path)
        return

    # Concatena os segmentos
    list_file = str(tmp_dir / "concat_list.txt")
    with open(list_file, "w") as f:
        for seg in segment_paths:
            f.write(f"file '{seg}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-threads", "2",
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
            download_to_file(job.camera_video_key, cam_local)
            job.progress_pct = 20
            db.commit()

            ref_keys = (
                job.reference_keys_json.split(",")
                if job.reference_keys_json
                else [job.reference_video_key]
            )

            ref_local_paths = []
            for i, key in enumerate(ref_keys):
                ext = key.split(".")[-1]
                local = str(tmp_path / f"ref_{i}.{ext}")
                download_to_file(key, local)
                ref_local_paths.append(local)

            job.progress_pct = 40
            db.commit()

            is_photo = getattr(job, 'reference_type', 'video') == "image"
            if is_photo:
                cam_duration = probe_duration_seconds(cam_local)

                # Recupera timestamps do carrossel se existirem
                timestamps = None
                if job.reference_keys_json and hasattr(job, 'photo_timestamps') and job.photo_timestamps:
                    try:
                        timestamps = json.loads(job.photo_timestamps)
                    except Exception:
                        timestamps = None

                _photos_to_video_synced(ref_local_paths, ref_for_compose, cam_duration, timestamps)
            else:
                ref_for_compose = ref_local_paths[0]

            job.progress_pct = 60
            db.commit()

            compose_duet(
                reference_path=ref_for_compose,
                camera_path=cam_local,
                output_path=out_local,
                layout=job.layout.value if hasattr(job.layout, "value") else job.layout,
            )
            job.progress_pct = 85
            db.commit()

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
