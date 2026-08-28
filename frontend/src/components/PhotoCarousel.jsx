import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PhotoCarousel — exibe um carrossel de fotos com setas manuais.
 * O usuário passa as fotos clicando nas setas enquanto grava.
 *
 * Props:
 *  - photos: File[] — array de arquivos de imagem
 */
export default function PhotoCarousel({ photos = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [objectUrls, setObjectUrls] = useState([]);

  useEffect(() => {
    // Limpa URLs anteriores
    objectUrls.forEach(url => URL.revokeObjectURL(url));

    if (!photos.length) {
      setObjectUrls([]);
      setCurrentIndex(0);
      return;
    }

    const urls = photos.map(f => URL.createObjectURL(f));
    setObjectUrls(urls);
    setCurrentIndex(0);

    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const next = () => setCurrentIndex(i => Math.min(objectUrls.length - 1, i + 1));

  if (!objectUrls.length) {
    return (
      <div className="w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-card border border-border/50 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Image className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Nenhuma foto carregada</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Container principal */}
      <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-black overflow-hidden border border-border/50 shadow-lg">
        
        {/* Foto atual */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={objectUrls[currentIndex]}
            alt={`Foto ${currentIndex + 1}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-contain"
          />
        </AnimatePresence>

        {/* Seta esquerda */}
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-20 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Seta direita */}
        <button
          onClick={next}
          disabled={currentIndex === objectUrls.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-20 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Contador */}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
          {currentIndex + 1} / {objectUrls.length}
        </div>

        {/* Indicadores (bolinhas) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {objectUrls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-white scale-110' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Miniaturas */}
      {objectUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {objectUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === currentIndex ? 'border-primary' : 'border-transparent opacity-60'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
