
import { useState, useCallback, useRef } from 'react';

export function useVideoComposition() {
  const [compositeBlob, setCompositeBlob] = useState(null);
  const [compositionProgress, setCompositionProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const composeVideos = useCallback(async (referenceVideoElement, recordedBlob) => {
    try {
      setError(null);
      setIsComposing(true);
      setCompositionProgress(0);
      setCompositeBlob(null);

      const recordedVideo = document.createElement('video');
      recordedVideo.muted = true;
      recordedVideo.playsInline = true;
      
      const recordedUrl = URL.createObjectURL(recordedBlob);
      recordedVideo.src = recordedUrl;

      await new Promise((resolve, reject) => {
        recordedVideo.onloadedmetadata = resolve;
        recordedVideo.onerror = reject;
      });

      const width = 1280;
      const halfHeight = 720;
      const totalHeight = halfHeight * 2;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d');

      const duration = Math.min(
        referenceVideoElement.duration,
        recordedVideo.duration
      );

      referenceVideoElement.currentTime = 0;
      recordedVideo.currentTime = 0;

      await Promise.all([
        new Promise(resolve => {
          referenceVideoElement.onseeked = resolve;
        }),
        new Promise(resolve => {
          recordedVideo.onseeked = resolve;
        })
      ]);

      const canvasStream = canvas.captureStream(30);
      
      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const chunks = [];
      const recorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        setCompositeBlob(blob);
        setCompositionProgress(100);
        setIsComposing(false);
        URL.revokeObjectURL(recordedUrl);
      };

      recorder.onerror = () => {
        setError('Video composition failed. Please try again.');
        setIsComposing(false);
        URL.revokeObjectURL(recordedUrl);
      };

      const drawFrame = () => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, totalHeight);

        if (referenceVideoElement.readyState >= 2) {
          ctx.drawImage(referenceVideoElement, 0, 0, width, halfHeight);
        }

        if (recordedVideo.readyState >= 2) {
          ctx.drawImage(recordedVideo, 0, halfHeight, width, halfHeight);
        }

        const currentTime = Math.max(
          referenceVideoElement.currentTime,
          recordedVideo.currentTime
        );
        const progress = Math.min((currentTime / duration) * 100, 99);
        setCompositionProgress(Math.floor(progress));

        if (currentTime < duration - 0.1) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      recorder.start(100);

      await Promise.all([
        referenceVideoElement.play(),
        recordedVideo.play()
      ]);

      drawFrame();

    } catch (err) {
      setError('Failed to compose videos. Please try again.');
      setIsComposing(false);
      setCompositionProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    setCompositeBlob(null);
    setCompositionProgress(0);
    setError(null);
    setIsComposing(false);
  }, []);

  return {
    compositeBlob,
    compositionProgress,
    error,
    isComposing,
    composeVideos,
    reset
  };
}
