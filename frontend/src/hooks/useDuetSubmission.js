import { useState, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-production-dae907.up.railway.app';

export function useDuetSubmission() {
  const [status, setStatus] = useState('idle');
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
        const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        });
        if (!res.ok) throw new Error('Falha ao consultar status do job.');
        const data = await res.json();

        setProgress(data.progress_pct ?? 0);

        if (data.status === 'done') {
          stopPolling();
          setDownloadUrl(`${API_BASE_URL}/jobs/${id}/file`);
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
    }, 2000);
  }, [stopPolling]);

  const submitDuet = useCallback(async ({ referenceFiles, cameraBlob, layout = 'top_bottom' }) => {
    setStatus('uploading');
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      const formData = new FormData();

      const [firstFile, ...extraFiles] = referenceFiles;
      const firstName = firstFile.name || 'reference_0';
      formData.append('reference_video', firstFile, firstName);

      extraFiles.forEach((file, i) => {
        formData.append('reference_photos', file, file.name || `photo_${i + 1}`);
      });

      formData.append(
        'camera_video',
        cameraBlob,
        `camera-${Date.now()}.${cameraBlob.type?.includes('webm') ? 'webm' : 'mp4'}`
      );
      formData.append('layout', layout);

      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Falha ao enviar arquivos para o servidor.');
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
