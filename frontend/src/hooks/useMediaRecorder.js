
import { useState, useRef, useCallback, useEffect } from 'react';

export function useMediaRecorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [error, setError] = useState(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const totalPausedTimeRef = useRef(0);
  const pauseStartTimeRef = useRef(null);
  const streamRef = useRef(null); // referência sempre atualizada do stream, sem causar re-render/loop

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 },
          facingMode: 'user'
        },
        audio: {
          sampleRate: 44100,
          sampleSize: 16,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      if (mediaStream.active && mediaStream.getTracks().length > 0) {
        setStream(mediaStream);
        streamRef.current = mediaStream;
        setIsStreamReady(true);
        setRecordedBlob(null);
      } else {
        throw new Error('Stream indisponível');
      }
      return mediaStream;
    } catch (err) {
      setIsStreamReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Acesso à câmera e microfone negado. Por favor, permita as permissões.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera ou microfone encontrado. Verifique seu dispositivo.');
      } else {
        setError('Falha ao acessar câmera e microfone. Verifique suas configurações.');
      }
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      streamRef.current = null;
      setIsStreamReady(false);
    }
    if (isRecording) {
      stopRecording();
    }
  }, [stream, isRecording]);

  // Efeito de desmontagem REAL: roda só quando o componente é destruído de
  // verdade (array de dependências vazio). Usamos o ref em vez de chamar
  // stopCamera() diretamente, porque stopCamera muda de identidade a cada
  // render (depende de `stream`/`isRecording`) — se ele estivesse nas
  // dependências aqui, o React rodaria essa limpeza a cada gravação iniciada,
  // desligando a câmera no meio do processo (era exatamente o bug).
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!stream || stream.getTracks().length === 0 || !isStreamReady) {
      setError('A câmera não está pronta ou o stream é inválido. Ligue a câmera primeiro.');
      return;
    }

    chunksRef.current = [];
    setRecordedBlob(null);
    setError(null);

    // Testa formatos em ordem de preferência de qualidade de áudio
    const formats = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,pcm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    // Testa formatos em ordem de preferência de qualidade de áudio
    
    let options = { mimeType: 'video/webm', audioBitsPerSecond: 256000 };
    for (const fmt of formats) {
      if (MediaRecorder.isTypeSupported(fmt)) {
        options = { mimeType: fmt, audioBitsPerSecond: 256000 };
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        totalPausedTimeRef.current = 0;
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTimeRef.current - totalPausedTimeRef.current;
          setDuration(Math.floor(elapsed / 1000));
        }, 100);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onpause = () => {
        setIsPaused(true);
        pauseStartTimeRef.current = Date.now();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.onresume = () => {
        setIsPaused(false);
        if (pauseStartTimeRef.current) {
          totalPausedTimeRef.current += (Date.now() - pauseStartTimeRef.current);
          pauseStartTimeRef.current = null;
        }

        timerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = now - startTimeRef.current - totalPausedTimeRef.current;
          setDuration(Math.floor(elapsed / 1000));
        }, 100);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setDuration(0);

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          setRecordedBlob(blob);
        } else {
          setError('Nenhum dado de vídeo capturado.');
        }
      };

      recorder.onerror = (event) => {
        setError(`Erro na gravação: ${event.error?.message || 'Falha desconhecida'}`);
        stopRecording();
      };

      recorder.start(100);
    } catch (err) {
      setError(`Falha ao iniciar MediaRecorder: ${err.message}`);
    }
  }, [stream, isStreamReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
    }
  }, [isRecording, isPaused]);

  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setDuration(0);
    chunksRef.current = [];
    setError(null);
  }, []);

  return {
    stream,
    isStreamReady,
    isRecording,
    isPaused,
    duration,
    recordedBlob,
    error,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording
  };
}
