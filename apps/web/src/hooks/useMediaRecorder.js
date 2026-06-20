
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

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      if (mediaStream.active && mediaStream.getTracks().length > 0) {
        setStream(mediaStream);
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
      setIsStreamReady(false);
    }
    if (isRecording) {
      stopRecording();
    }
  }, [stream, isRecording]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stopCamera]);

  const startRecording = useCallback(() => {
    if (!stream || stream.getTracks().length === 0 || !isStreamReady) {
      setError('A câmera não está pronta ou o stream é inválido. Ligue a câmera primeiro.');
      return;
    }

    chunksRef.current = [];
    setRecordedBlob(null);
    setError(null);

    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
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
