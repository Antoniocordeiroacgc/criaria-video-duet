
import React from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function CompositionProgress({
  compositionProgress,
  isComposing,
  compositionError,
  uploadProgress,
  uploadStatus,
  uploadError,
  compositeBlob,
  uploadedFileUrl,
  onRetryUpload,
  onNewRecording
}) {
  const formatFileSize = (blob) => {
    if (!blob) return '0 MB';
    const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
    return `${sizeInMB} MB`;
  };

  const handleDownload = () => {
    if (uploadedFileUrl) {
      const a = document.createElement('a');
      a.href = uploadedFileUrl;
      a.download = `video-duet-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto p-6 bg-card rounded-2xl border border-border"
    >
      {isComposing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <h3 className="text-lg font-semibold">Composing video...</h3>
          </div>
          <Progress value={compositionProgress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {compositionProgress}% complete
          </p>
        </div>
      )}

      {compositionError && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Composition failed</h3>
          </div>
          <p className="text-sm text-muted-foreground">{compositionError}</p>
        </div>
      )}

      {!isComposing && !compositionError && uploadStatus === 'uploading' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <h3 className="text-lg font-semibold">Uploading...</h3>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{uploadProgress}% complete</span>
            <span className="text-muted-foreground font-medium">
              {formatFileSize(compositeBlob)}
            </span>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Upload complete</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your video duet is ready to download ({formatFileSize(compositeBlob)})
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={onNewRecording}
              variant="secondary"
              className="flex-1 transition-all duration-200 active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New recording
            </Button>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Upload failed</h3>
          </div>
          <p className="text-sm text-muted-foreground">{uploadError}</p>
          <Button
            onClick={onRetryUpload}
            className="w-full bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry upload
          </Button>
        </div>
      )}
    </motion.div>
  );
}
