
import React, { forwardRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';

const VideoPlayer = forwardRef(({ file, className = '' }, ref) => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setVideoSrc(null);
      setMetadata(null);
      return;
    }

    try {
      if (file instanceof File) {
        const url = URL.createObjectURL(file);
        setVideoSrc(url);
        
        return () => {
          URL.revokeObjectURL(url);
        };
      } else if (typeof file === 'string') {
        setVideoSrc(file);
      }
    } catch (err) {
      setError("Falha ao carregar o vídeo de referência.");
    }
  }, [file]);

  const handleLoadedMetadata = (e) => {
    setMetadata({
      duration: e.target.duration,
      width: e.target.videoWidth,
      height: e.target.videoHeight
    });
  };

  const handleError = () => {
    setError("O formato de vídeo não é suportado ou o arquivo está corrompido.");
  };

  if (!videoSrc) {
    return (
      <div className={`w-full aspect-video rounded-xl bg-card border border-border/50 flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <Film className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Nenhum vídeo de referência selecionado</p>
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
      <video
        ref={ref}
        src={videoSrc}
        controls
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        className="w-full aspect-video object-cover rounded-xl bg-black border border-border/50 shadow-lg"
      >
        Seu navegador não suporta a reprodução de vídeo.
      </video>
      
      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
      
      {metadata && !error && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Resolução: {metadata.width}x{metadata.height}</span>
          <span className="timer-display">Duração: {Math.floor(metadata.duration)}s</span>
        </div>
      )}
    </motion.div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
