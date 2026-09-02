"""
Motor de composição de vídeo: junta o vídeo de referência + vídeo da câmera
em um único MP4 split-screen, com marca d'água da CRIAR.IA TECNOLOGIA.
"""
import subprocess
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

TARGET_WIDTH = 1080
TARGET_HEIGHT_HALF = 960


class FFmpegError(Exception):
    pass


def _run_ffmpeg(cmd: list[str]) -> None:
    logger.info("Executando FFmpeg: %s", " ".join(cmd))
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr
        # FFmpeg retorna código != 0 mesmo quando processa com sucesso
        # Só falha de verdade se não há progresso (frame=0) ou erro crítico
        if "frame=    0" in stderr and "time=N/A" in stderr:
            logger.error("FFmpeg falhou sem progresso: %s", stderr[-4000:])
            raise FFmpegError(stderr[-2000:])
        # Se processou frames, considera sucesso
        logger.warning("FFmpeg retornou código %s mas processou frames", result.returncode)

def probe_duration_seconds(input_path: str) -> float:
    for entry in ("format=duration", "stream=duration"):
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", entry,
            "-of", "default=noprint_wrappers=1:nokey=1",
            input_path,
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output = result.stdout.strip()
        for line in output.splitlines():
            try:
                val = float(line)
                if val > 0:
                    return val
            except ValueError:
                continue
    try:
        frames = int(result.stdout.strip())
        return frames / 30.0
    except (ValueError, ZeroDivisionError):
        return 30.0


def _fix_audio(input_path: str) -> str:
    tmp_wav = input_path.replace(".webm", "_fixed.wav").replace(".mp4", "_fixed.wav")
    cmd = [
        "ffmpeg", "-y",
        "-threads", "2",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-ac", "2",
        tmp_wav,
    ]
    _run_ffmpeg(cmd)
    return tmp_wav


def _convert_to_mp4(input_path: str, output_path: str) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-threads", "2",
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-movflags", "+faststart",
        output_path,
    ]
    _run_ffmpeg(cmd)


def compose_duet(
    reference_path: str,
    camera_path: str,
    output_path: str,
    layout: str = "top_bottom",
    watermark_text: str | None = None,
) -> None:
    watermark_text = watermark_text or settings.WATERMARK_TEXT

    fixed_audio_path = _fix_audio(camera_path)

    ref_converted = str(Path(output_path).parent / "ref_conv.mp4")
    _convert_to_mp4(reference_path, ref_converted)

    cam_converted = str(Path(output_path).parent / "cam_conv.mp4")
    _convert_to_mp4(camera_path, cam_converted)

    if layout == "top_bottom":
        w, h = TARGET_WIDTH, TARGET_HEIGHT_HALF
        filter_complex = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[top];"
            f"[1:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[bottom];"
            f"[top][bottom]vstack=inputs=2[final_v]"
        )
    elif layout == "side_by_side":
        w, h = 960, 1080
        filter_complex = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[left];"
            f"[1:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[right];"
            f"[left][right]hstack=inputs=2[final_v]"
        )
    else:
        raise ValueError(f"Layout inválido: {layout}")

    cmd = [
        "ffmpeg", "-y",
        "-threads", "2",
        "-i", ref_converted,
        "-i", cam_converted,
        "-i", fixed_audio_path,
        "-filter_complex", filter_complex,
        "-map", "[final_v]",
        "-map", "2:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-threads", "2",
        "-max_muxing_queue_size", "9999",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-shortest",
        output_path,
    ]

    _run_ffmpeg(cmd)

    try:
        Path(fixed_audio_path).unlink()
    except Exception:
        pass

    if not Path(output_path).exists() or Path(output_path).stat().st_size == 0:
        raise FFmpegError("Arquivo de saída não foi gerado ou está vazio.")
