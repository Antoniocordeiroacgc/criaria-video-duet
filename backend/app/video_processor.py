"""
Motor de composição de vídeo: junta o vídeo de referência + vídeo da câmera
em um único MP4 split-screen, com marca d'água da CRIAR.IA TECNOLOGIA.

Por que FFmpeg via subprocess e não uma lib Python "wrapper":
  - Controle total sobre o filtergraph (escala, crop, overlay, watermark)
  - Performance: roda em C, usa hardware encoding se disponível
  - É o padrão de mercado (TikTok, CapCut server-side, etc. usam FFmpeg)

Estratégia de filtergraph:
  1. Escala cada vídeo de entrada para a MESMA largura (ex.: 1080px),
     preservando aspect ratio e cropando o excesso (cover, não letterbox).
  2. Empilha (vstack) ou lado a lado (hstack) os dois vídeos.
  3. Sincroniza áudio: usamos APENAS o áudio do vídeo da câmera (reação do
     usuário), pois é o que importa socialmente. Se quiser mixar os dois
     áudios, há uma variante comentada abaixo.
  4. Aplica marca d'água de texto (drawtext) fixa no canto inferior.
  5. Re-encoda em H.264 + AAC, compatível com Instagram/TikTok/WhatsApp.
"""
import subprocess
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

# Resolução de saída por lado (cada metade da tela)
TARGET_WIDTH = 1080
TARGET_HEIGHT_HALF = 960  # 1080x1920 final dividido em duas metades de 960 (top_bottom)


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
        logger.error("FFmpeg falhou (code=%s): %s", result.returncode, result.stderr[-4000:])
        raise FFmpegError(result.stderr[-2000:])


def probe_duration_seconds(input_path: str) -> float:
    """Usa ffprobe para checar duração — usado para validar limites (anti-abuso)."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        input_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise FFmpegError(f"ffprobe falhou: {result.stderr}")
    return float(result.stdout.strip())


def compose_duet(
    reference_path: str,
    camera_path: str,
    output_path: str,
    layout: str = "top_bottom",
    watermark_text: str | None = None,
) -> None:
    """
    Compõe o vídeo final de duet.

    layout:
      - "top_bottom": referência em cima, câmera embaixo (formato vertical 9:16,
        ideal para Reels/TikTok/Stories)
      - "side_by_side": lado a lado (formato horizontal 16:9)
    """
    watermark_text = watermark_text or settings.WATERMARK_TEXT
    # Escapa caracteres especiais do drawtext do FFmpeg
    safe_watermark = watermark_text.replace(":", "\\:").replace("'", "\\'")

    if layout == "top_bottom":
        # Saída final: 1080x1920 (vertical), cada vídeo ocupa 1080x960
        w, h = TARGET_WIDTH, TARGET_HEIGHT_HALF
        filter_complex = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[top];"
            f"[1:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[bottom];"
            f"[top][bottom]vstack=inputs=2[stacked];"
            f"[stacked]drawtext=text='{safe_watermark}':"
            f"fontcolor=white:fontsize=28:box=1:boxcolor=black@0.45:boxborderw=10:"
            f"x=(w-text_w)/2:y=h-th-30[final_v]"
        )
    elif layout == "side_by_side":
        # Saída final: 1920x1080 (horizontal), cada vídeo ocupa 960x1080
        w, h = 960, 1080
        filter_complex = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[left];"
            f"[1:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},setsar=1[right];"
            f"[left][right]hstack=inputs=2[stacked];"
            f"[stacked]drawtext=text='{safe_watermark}':"
            f"fontcolor=white:fontsize=28:box=1:boxcolor=black@0.45:boxborderw=10:"
            f"x=(w-text_w)/2:y=h-th-30[final_v]"
        )
    else:
        raise ValueError(f"Layout inválido: {layout}")

    cmd = [
        "ffmpeg", "-y",
        "-i", reference_path,
        "-i", camera_path,
        "-filter_complex", filter_complex,
        "-map", "[final_v]",
        # Áudio: usa o áudio do vídeo da câmera (input 1 = reação do usuário)
        "-map", "1:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",     # bom equilíbrio velocidade/tamanho para servidor sem GPU
        "-crf", "23",              # qualidade visual (menor = melhor, 18-28 é a faixa útil)
        "-pix_fmt", "yuv420p",     # compatibilidade máxima (iOS/Android/redes sociais)
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart", # permite tocar o vídeo antes do download completo
        "-shortest",               # corta no vídeo mais curto dos dois
        output_path,
    ]

    _run_ffmpeg(cmd)

    if not Path(output_path).exists() or Path(output_path).stat().st_size == 0:
        raise FFmpegError("Arquivo de saída não foi gerado ou está vazio.")


# --- Variante alternativa: mixar os dois áudios (referência + câmera) ---
# Troque o bloco de mapeamento de áudio por isto, se quiser ouvir ambos:
#
#   filter_complex += (
#       ";[0:a]volume=0.4[a0];[1:a]volume=1.0[a1];"
#       "[a0][a1]amix=inputs=2:duration=shortest[final_a]"
#   )
#   cmd = [..., "-map", "[final_v]", "-map", "[final_a]", ...]  # sem "-map 1:a?"
