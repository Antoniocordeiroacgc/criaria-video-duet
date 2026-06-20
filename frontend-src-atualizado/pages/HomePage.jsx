
import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Video, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPlayer from '@/components/VideoPlayer.jsx';
import CameraRecorder from '@/components/CameraRecorder.jsx';

export default function HomePage() {
  const referenceVideoRef = useRef(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleReferenceVideoUpload = (event) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Por favor, selecione um arquivo de vídeo válido.');
      return;
    }

    setReferenceFile(file);
  };

  return (
    <>
      <Helmet>
        <title>Video Duet Recorder - CRIAR.IA TECNOLOGIA</title>
        <meta name="description" content="Grave e acompanhe vídeos em layout lado a lado de forma prática e rápida." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground leading-none mb-1">
                    Video Duet Recorder
                  </h1>
                  <p className="text-xs font-medium text-primary tracking-wide uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    CRIAR.IA TECNOLOGIA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 main-content-wrapper">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Reference Video Column */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-foreground">1</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Vídeo Referência</h2>
                    <p className="text-sm text-muted-foreground">
                      Assista ao vídeo enquanto grava sua resposta.
                    </p>
                  </div>
                </div>
                
                {/* Reference Video Upload Button */}
                <div>
                  <input
                    type="file"
                    accept="video/*"
                    id="ref-video-upload"
                    className="hidden"
                    onChange={handleReferenceVideoUpload}
                  />
                  <label 
                    htmlFor="ref-video-upload"
                    className="custom-file-upload bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium px-4 py-2 rounded-lg border border-border"
                  >
                    <Upload className="w-4 h-4" />
                    Upar Vídeo
                  </label>
                </div>
              </div>
              
              {uploadError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">{uploadError}</p>
                </div>
              )}
              
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
                <VideoPlayer
                  ref={referenceVideoRef}
                  file={referenceFile}
                />
                {referenceFile && (
                  <p className="text-xs text-muted-foreground text-center px-2 truncate" title={referenceFile.name}>
                    Arquivo ativo: <span className="font-medium text-foreground">{referenceFile.name}</span>
                  </p>
                )}
              </div>
            </motion.section>

            {/* Camera / Recording Column */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-foreground">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Sua Câmera</h2>
                  <p className="text-sm text-muted-foreground">
                    Ligue a câmera e grave seu vídeo duet.
                  </p>
                </div>
              </div>
              <div className="w-full max-w-2xl mx-auto">
                <CameraRecorder referenceFile={referenceFile} />
              </div>
            </motion.section>
          </div>
        </main>

        <footer className="fixed-footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground tracking-wide font-medium">
              Desenvolvido por <span className="text-primary">CRIAR.IA TECNOLOGIA</span> | criarhub.com © 2026
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
