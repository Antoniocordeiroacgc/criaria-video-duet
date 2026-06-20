
import { useState, useCallback, useRef } from 'react';

export function useUploadProgress() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  
  const intervalRef = useRef(null);

  const simulateUpload = useCallback(async (fileBlob, onProgress) => {
    try {
      setError(null);
      setUploadStatus('uploading');
      setUploadProgress(0);
      setUploadedFileUrl(null);

      const totalChunks = 100;
      let currentChunk = 0;

      intervalRef.current = setInterval(() => {
        currentChunk += Math.floor(Math.random() * 5) + 1;
        
        if (currentChunk >= totalChunks) {
          currentChunk = totalChunks;
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          
          const fileUrl = URL.createObjectURL(fileBlob);
          setUploadedFileUrl(fileUrl);
          setUploadProgress(100);
          setUploadStatus('success');
        } else {
          setUploadProgress(currentChunk);
        }

        if (onProgress) {
          onProgress(currentChunk);
        }
      }, 50);

    } catch (err) {
      setError('Upload failed. Please try again.');
      setUploadStatus('error');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  const retry = useCallback((fileBlob, onProgress) => {
    setError(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    simulateUpload(fileBlob, onProgress);
  }, [simulateUpload]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadProgress(0);
    setUploadStatus('idle');
    setError(null);
    setUploadedFileUrl(null);
  }, [uploadedFileUrl]);

  return {
    uploadProgress,
    uploadStatus,
    error,
    uploadedFileUrl,
    simulateUpload,
    retry,
    reset
  };
}
