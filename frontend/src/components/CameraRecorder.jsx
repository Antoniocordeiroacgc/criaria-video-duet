
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Square, Circle, Camera, CameraOff, Download, UploadCloud, CheckCircle2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaRecorder } from '@/hooks/useMediaRecorder.js';
import { useDuetSubmission } from '@/hooks/useDuetSubmission.js';

export default function CameraRecorder({ onRecordingComplete, referenceFile }) {
  const videoRef = useRef(null);
  const {
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
  } = useMediaRecorder();

  const {
    status: submitStatus,
    progress: submitProgress,
    downloadUrl,
    errorMessage: submitError,
    submitDuet,
    reset: resetSubmission,
  } = useDuetSubmission();

  const handleNewRecording = () => {
    resetSubmission();
    resetRecording();
  };

  const handleSendForComposition = () => {
    if (!referenceFile) {
      return; // o componente abaixo já mostra aviso quando não há vídeo de referência
    }
    submitDuet({ referenceFile, cameraBlob: recordedBlob, layout: 'top_bottom' });
  };
  useEffect(() => {
    if (videoRef.current && stream && isStreamReady) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isStreamReady]);

  useEffect(() => {
    if (recordedBlob && onRecordingComplete) {
      onRecordingComplete(recordedBlob);
    }
  }, [recordedBlob, onRecordingComplete]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gravacao-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex flex-col gap-4"
    >
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border/50 shadow-lg">
        {isStreamReady && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50">
            <Video className="w-16 h-16 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm font-medium">A câmera está desligada</p>
          </div>
        )}
        
        {isRecording && !isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-white px-3 py-1.5 rounded-lg shadow-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Circle className="w-3 h-3 fill-current" />
            </motion.div>
            <span className="text-sm font-bold tracking-wider">REC</span>
          </motion.div>
        )}

        {isRecording && isPaused && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-500/90 text-white px-3 py-1.5 rounded-lg shadow-sm">
            <Pause className="w-3 h-3 fill-current" />
            <span className="text-sm font-bold tracking-wider">PAUSED</span>
          </div>
        )}

        {(isRecording || isPaused) && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-medium timer-display">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
        >
          <p className="text-sm text-destructive font-medium">{error}</p>
        </motion.div>
      )}

      {/* Control Actions */}
      <div className="flex flex-col gap-4">
        {/* State 1: No recorded blob yet */}
        {!recordedBlob && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isStreamReady ? (
              <Button
                onClick={startCamera}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
              >
                <Camera className="w-5 h-5 mr-2" />
                Ligar Câmera
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopCamera}
                  size="lg"
                  variant="secondary"
                  className="font-medium"
                  disabled={isRecording}
                >
                  <CameraOff className="w-5 h-5 mr-2" />
                  Desligar Câmera
                </Button>

                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-md"
                  >
                    <Circle className="w-5 h-5 mr-2 fill-current" />
                    Gravar
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      size="lg"
                      variant="secondary"
                      className="font-medium border-border"
                    >
                      {isPaused ? (
                        <><Play className="w-5 h-5 mr-2 fill-current" /> Retomar</>
                      ) : (
                        <><Pause className="w-5 h-5 mr-2 fill-current" /> Pausar</>
                      )}
                    </Button>
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-md"
                    >
                      <Square className="w-5 h-5 mr-2 fill-current" />
                      Parar Gravação
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* State 2: Blob generated after stopping recording */}
        {recordedBlob && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-4 p-5 bg-card border border-border shadow-sm rounded-xl"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Gravação concluída
              </h3>
              <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md timer-display">
                {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar Vídeo Gravado
              </Button>
              
              <Button
                onClick={handleSendForComposition}
                size="lg"
                variant="secondary"
                className="w-full font-semibold border-border"
                disabled={!referenceFile || submitStatus === 'uploading' || submitStatus === 'processing'}
              >
                {submitStatus === 'idle' && <><UploadCloud className="w-5 h-5 mr-2" /> Gerar Duet</>}
                {submitStatus === 'uploading' && <><span className="w-5 h-5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" /> Enviando...</>}
                {submitStatus === 'processing' && <><span className="w-5 h-5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processando {submitProgress}%</>}
                {submitStatus === 'done' && <><CheckCircle2 className="w-5 h-5 mr-2 text-green-500" /> Duet pronto!</>}
                {submitStatus === 'error' && <>Tentar novamente</>}
              </Button>
            </div>

            {!referenceFile && (
              <p className="text-xs text-yellow-600 text-center -mt-1">
                Envie um vídeo de referência acima para poder gerar o duet.
              </p>
            )}

            {submitStatus === 'error' && submitError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">{submitError}</p>
              </div>
            )}

            {submitStatus === 'done' && downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg py-3"
              >
                <Download className="w-5 h-5" />
                Baixar Vídeo Duet Final
              </a>
            )}

            <Button
              onClick={handleNewRecording}
              variant="ghost"
              className="mt-2 text-muted-foreground hover:text-foreground w-full font-medium"
            >
              Fazer nova gravação
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
