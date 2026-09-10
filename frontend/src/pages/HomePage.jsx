import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Video, Sparkles, Upload, Image, Film, FileText } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer.jsx';
import PhotoCarousel from '@/components/PhotoCarousel.jsx';
import CameraRecorder from '@/components/CameraRecorder.jsx';
import Teleprompter from '@/components/Teleprompter.jsx';

export default function HomePage() {
  const referenceVideoRef = useRef(null);
  const carouselRef = useRef(null);

  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePhotos, setReferencePhotos] = useState([]);
  const [mediaMode, setMediaMode] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  // Teleprompter
  const [teleprompterText, setTeleprompterText] = useState('');
  const [showTeleprompterInput, setShowTeleprompterInput] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  const videoInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const handleVideoUpload = (event) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setUploadError('Por favor, selecione um arquivo de vídeo válido.');
      return;
    }
    setReferenceFile(file);
    setReferencePhotos([]);
    setMediaMode('video');
    setShowPicker(false);
    setTimeout(() => {
      if (referenceVideoRef.current) {
        referenceVideoRef.current.pause();
        referenceVideoRef.current.currentTime = 0;
      }
    }, 300);
  };

  const handlePhotosUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setUploadError(null);
    if (!files.length) return;
    const invalid = files.filter(f => !f.type.startsWith('image/'));
    if (invalid.length) {
      setUploadError('Por favor, selecione apenas imagens (JPG, PNG, WebP).');
      return;
    }
    setReferencePhotos(files);
    setReferenceFile(null);
    setMediaMode('photos');
    setShowPicker(false);
  };

  const referenceForCamera = mediaMode === 'photos' ? referencePhotos : referenceFile;

  return (
    <>
      <Helmet>
        <title>DuoVideo - CRIAR.IA TECNOLOGIA</title>
        <meta name="description" content="Grave e acompanhe vídeos em layout lado a lado de forma prática e rápida." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground leading-none mb-1">DuoVideo</h1>
                <p className="text-xs font-medium text-primary tracking-wide uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />CRIAR.IA TECNOLOGIA
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Coluna 1 — Referência + Teleprompter */}
            <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-foreground">1</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Referência</h2>
                    <p className="text-sm text-muted-foreground">Vídeo, fotos ou teleprompter.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão Teleprompter */}
                  <button
                    onClick={() => setShowTeleprompterInput(v => !v)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${showTeleprompterInput ? 'bg-primary text-white border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Teleprompter
                  </button>

                  {/* Botão Upar */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPicker(v => !v)}
                      className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium px-4 py-2 rounded-lg border border-border"
                    >
                      <Upload className="w-4 h-4" />Upar
                    </button>

                    {showPicker && (
                      <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-44">
                        <button onClick={() => { setShowPicker(false); videoInputRef.current?.click(); }} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted text-sm text-foreground">
                          <Film className="w-4 h-4 text-primary" />Vídeo
                        </button>
                        <div className="border-t border-border" />
                        <button onClick={() => { setShowPicker(false); photoInputRef.current?.click(); }} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted text-sm text-foreground">
                          <Image className="w-4 h-4 text-primary" />Fotos (carrossel)
                        </button>
                      </div>
                    )}

                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosUpload} />
                  </div>
                </div>
              </div>

              {/* Campo de texto do teleprompter */}
              {showTeleprompterInput && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={teleprompterText}
                    onChange={e => setTeleprompterText(e.target.value)}
                    placeholder="Digite o texto que vai rolar na tela enquanto você grava..."
                    rows={4}
                    className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {teleprompterText.trim() && (
                    <p className="text-xs text-muted-foreground">
                      O teleprompter vai aparecer sobreposto à referência quando você começar a gravar.
                    </p>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">{uploadError}</p>
                </div>
              )}

              <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
                {/* Container da referência com teleprompter sobreposto */}
                <div className="relative">
                  {mediaMode === 'video' && <VideoPlayer ref={referenceVideoRef} file={referenceFile} />}
                  {mediaMode === 'photos' && <PhotoCarousel ref={carouselRef} photos={referencePhotos} />}
                  {!mediaMode && (
                    <div className="w-full aspect-[9/16] max-h-[70vh] rounded-xl bg-card border border-border/50 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="flex gap-4 text-muted-foreground">
                        <Film className="w-10 h-10" />
                        <Image className="w-10 h-10" />
                      </div>
                      <p className="text-muted-foreground text-sm font-medium">Nenhuma mídia selecionada</p>
                      <p className="text-muted-foreground/70 text-xs">Clique em "Upar" para escolher vídeo ou fotos</p>
                    </div>
                  )}

                  {/* Teleprompter sobreposto na referência */}
                  {showTeleprompter && teleprompterText.trim() && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      <Teleprompter
                        text={teleprompterText}
                        isRecording={isRecordingActive}
                        onClose={() => setShowTeleprompter(false)}
                      />
                    </div>
                  )}
                </div>

                {mediaMode === 'video' && referenceFile && (
                  <p className="text-xs text-muted-foreground text-center px-2 truncate">
                    Arquivo ativo: <span className="font-medium text-foreground">{referenceFile.name}</span>
                  </p>
                )}
                {mediaMode === 'photos' && referencePhotos.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    <span className="font-medium text-foreground">{referencePhotos.length} fotos</span> carregadas
                  </p>
                )}
              </div>
            </motion.section>

            {/* Coluna 2 — Câmera */}
            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-foreground">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Sua Câmera</h2>
                  <p className="text-sm text-muted-foreground">Ligue a câmera e grave seu vídeo duet.</p>
                </div>
              </div>
              <div className="w-full max-w-2xl mx-auto">
                <CameraRecorder
                  referenceFile={referenceForCamera}
                  referenceMode={mediaMode}
                  carouselRef={carouselRef}
                  referenceVideoRef={referenceVideoRef}
                  onRecordingStart={() => {
                    carouselRef.current?.startRecording();
                    // Ativa teleprompter se houver texto
                    if (teleprompterText.trim()) {
                      setShowTeleprompter(true);
                    }
                    setIsRecordingActive(true);
                  }}
                />
              </div>
            </motion.section>
          </div>
        </main>

        <footer className="border-t border-border py-4 text-center">
          <p className="text-sm text-muted-foreground tracking-wide font-medium">
            Desenvolvido por <span className="text-primary">CRIAR.IA TECNOLOGIA</span> | criarhub.com © 2026
          </p>
        </footer>
      </div>
    </>
  );
}
