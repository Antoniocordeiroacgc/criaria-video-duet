import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PhotoCarousel = forwardRef(({ photos = [] }, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [objectUrls, setObjectUrls] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const timestampsRef = useRef([]);
  const recordingStartRef = useRef(null);

  useEffect(() => {
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

  const recordTimestamp = useCallback((index) => {
    if (!isRecording || !recordingStartRef.current) return;
    const elapsed = (Date.now() - recordingStartRef.current) / 1000;
    timestampsRef.current.push({ photoIndex: index, startTime: elapsed });
  }, [isRecording]);

  const goTo = useCallback((index) => {
    setCurrentIndex(index);
    recordTimestamp(index);
  }, [recordTimestamp]);

  const prev = () => goTo(Math.max(0, currentIndex - 1));
  const next = () => goTo(Math.min(objectUrls.length - 1, currentIndex + 1));

  useImperativeHandle(ref, () => ({
    startRecording: () => {
      timestampsRef.current = [{ photoIndex: currentIndex, startTime: 0 }];
      recordingStartRef.current = Date.now();
      setIsRecording(true);
    },
    stopRecording: () => {
      setIsRecording(false);
      recordingStartRef.current = null;
      return timestampsRef.current;
    },
    getTimestamps: () => timestampsRef.current,
  }));

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
      <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-black overflow-hidden border border-border/50 shadow-lg">

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

        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-medium z-30">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Gravando
          </div>
        )}

        {/* Seta esquerda — z-30 para ficar acima do teleprompter */}
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-20 transition-all z-30"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Seta direita — z-30 para ficar acima do teleprompter */}
        <button
          onClick={next}
          disabled={currentIndex === objectUrls.length - 1}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white disabled:opacity-20 transition-all z-30"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full z-30">
          {currentIndex + 1} / {objectUrls.length}
        </div>

        {/* Bolinhas indicadoras — z-30 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
          {objectUrls.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-110' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {objectUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {objectUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-primary' : 'border-transparent opacity-60'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

PhotoCarousel.displayName = 'PhotoCarousel';
export default PhotoCarousel;
