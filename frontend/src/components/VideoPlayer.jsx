import { forwardRef, useState, useRef, useEffect } from 'react';
import { Film } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoPlayer = forwardRef(({ file, className = '' }, ref) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  // Expõe ref externo
  useEffect(() => {
    if (ref) ref.current = videoRef.current;
  }, [showVideo]);

  useEffect(() => {
    setShowVideo(false);
    setMetadata(null);
    setError(null);

    if (!file) {
      setBlobUrl(null);
      return;
    }

    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof file === 'string') {
      setBlobUrl(file);
    }
  }, [file]);

  // Clique no botão de play — chama play() no mesmo evento (sem useEffect)
  const handlePlayClick = (e) => {
    e.stopPropagation();
    setShowVideo(true);
    // Aguarda o DOM montar o <video> e chama play() diretamente
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        videoRef.current?.play().catch(console.warn);
      });
    });
  };

  if (!file || !blobUrl) {
    return (
      <div className={`w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-card border border-border/50 flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <Film className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Nenhum vídeo selecionado</p>
        <p className="text-muted-foreground/70 text-xs mt-1">Faça o upload de um vídeo para começar</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative w-full flex flex-col gap-2 ${className}`}
    >
      <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-black overflow-hidden border border-border/50 shadow-lg">

        {/* Botão de play — aparece antes do vídeo ser montado */}
        {!showVideo && (
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-900 gap-4 z-10"
          >
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-xl">
              <svg className="w-9 h-9 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white/70 text-sm">Clique para reproduzir</span>
            {file?.name && (
              <span className="text-white/40 text-xs px-6 text-center truncate max-w-full">{file.name}</span>
            )}
          </button>
        )}

        {/* Vídeo — só montado após clique */}
        {showVideo && (
          <video
            ref={videoRef}
            src={blobUrl}
            controls
            playsInline
            onLoadedMetadata={(e) => setMetadata({
              duration: e.target.duration,
              width: e.target.videoWidth,
              height: e.target.videoHeight,
            })}
            onError={() => setError("Formato não suportado.")}
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive px-1">{error}</p>}
      {metadata && !error && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Resolução: {metadata.width}x{metadata.height}</span>
          <span>Duração: {Math.floor(metadata.duration)}s</span>
        </div>
      )}
    </motion.div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
