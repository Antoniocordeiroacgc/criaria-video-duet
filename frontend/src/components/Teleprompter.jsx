import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Pause, Play } from 'lucide-react';

/**
 * Teleprompter — exibe texto rolando automaticamente sobre a câmera.
 * Não aparece no vídeo gravado, só na tela do usuário.
 *
 * Props:
 *  - text: string — texto a ser exibido
 *  - isRecording: bool — inicia/para o scroll automático
 *  - onClose: fn — fecha o teleprompter
 */
export default function Teleprompter({ text, isRecording, onClose }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const scrollPosRef = useRef(0);
  const [speed, setSpeed] = useState(2); // 1=lento, 2=normal, 3=rápido
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  const speedValues = { 1: 0.5, 2: 1.2, 3: 2.5 }; // pixels por frame

  const scroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || paused || finished) {
      animRef.current = requestAnimationFrame(scroll);
      return;
    }

    scrollPosRef.current += speedValues[speed];
    el.scrollTop = scrollPosRef.current;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setFinished(true);
      return;
    }

    animRef.current = requestAnimationFrame(scroll);
  }, [paused, speed, finished]);

  useEffect(() => {
    if (isRecording && !finished) {
      animRef.current = requestAnimationFrame(scroll);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRecording, scroll, finished]);

  const restart = () => {
    scrollPosRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setFinished(false);
    setPaused(false);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* Gradiente superior */}
      <div className="h-16 bg-gradient-to-b from-black/70 to-transparent" />

      {/* Área de texto rolante — só o texto captura eventos */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden px-16 pointer-events-none"
        style={{ scrollBehavior: 'auto' }}
      >
        <p
          className="text-white text-2xl font-semibold leading-relaxed text-center drop-shadow-lg"
          style={{
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            paddingTop: '20vh',
            paddingBottom: '60vh',
          }}
        >
          {text}
        </p>
      </div>

      {/* Gradiente inferior */}
      <div className="h-16 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Linha central */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-primary/60 pointer-events-none" />

      {/* Controles — habilitam cliques */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4 pointer-events-auto">
        <div className="flex items-center gap-1 bg-black/70 rounded-full px-3 py-1.5">
          <button onClick={() => setSpeed(s => Math.max(1, s - 1))} className="text-white p-1">
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-white text-xs font-medium w-12 text-center">
            {speed === 1 ? 'Lento' : speed === 2 ? 'Normal' : 'Rápido'}
          </span>
          <button onClick={() => setSpeed(s => Math.min(3, s + 1))} className="text-white p-1">
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setPaused(p => !p)}
          className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-1.5 text-white text-xs font-medium"
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? 'Retomar' : 'Pausar'}
        </button>

        {finished && (
          <button onClick={restart} className="bg-primary rounded-full px-4 py-1.5 text-white text-xs font-medium">
            Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
