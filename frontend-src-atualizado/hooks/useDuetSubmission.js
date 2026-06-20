import { useState, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Hook que substitui o "Simular Upload": envia o vídeo de referência + o
 * vídeo gravado da câmera para o backend, e faz polling do status até
 * o FFmpeg terminar a composição.
 */
export function useDuetSubmission() {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback((id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/jobs/${id}`);
        if (!res.ok) throw new Error('Falha ao consultar status do job.');
        const data = await res.json();

        setProgress(data.progress_pct ?? 0);

        if (data.status === 'done') {
          stopPolling();
          const dlRes = await fetch(`${API_BASE_URL}/jobs/${id}/download`);
          const dlData = await dlRes.json();
          setDownloadUrl(dlData.download_url);
          setStatus('done');
        } else if (data.status === 'failed') {
          stopPolling();
          setErrorMessage(data.error_message || 'Falha ao processar o vídeo.');
          setStatus('error');
        } else {
          setStatus('processing');
        }
      } catch (err) {
        stopPolling();
        setErrorMessage(err.message);
        setStatus('error');
      }
    }, 2000); // polling a cada 2s — suficiente para vídeos curtos, sem sobrecarregar a API
  }, [stopPolling]);

  const submitDuet = useCallback(async ({ referenceFile, cameraBlob, layout = 'top_bottom' }) => {
    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append('reference_video', referenceFile, referenceFile.name || 'reference.mp4');
      formData.append(
        'camera_video',
        cameraBlob,
        `camera-${Date.now()}.${cameraBlob.type.includes('webm') ? 'webm' : 'mp4'}`
      );
      formData.append('layout', layout);

      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Falha ao enviar vídeos para o servidor.');
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatus('processing');
      pollStatus(data.job_id);
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }, [pollStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    setJobId(null);
    setDownloadUrl(null);
    setErrorMessage(null);
  }, [stopPolling]);

  return { status, progress, jobId, downloadUrl, errorMessage, submitDuet, reset };
}
