import React, { useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Video, Sparkles, Upload, Image, Film, FileText, MessageCircle, LogOut } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer.jsx';
import PhotoCarousel from '@/components/PhotoCarousel.jsx';
import CameraRecorder from '@/components/CameraRecorder.jsx';
import Teleprompter from '@/components/Teleprompter.jsx';
import ContactModal from '@/components/ContactModal.jsx';
import FilterSelector, { FILTERS } from '@/components/FilterSelector.jsx';

export default function HomePage({ user }) {
  const referenceVideoRef = useRef(null);
  const carouselRef = useRef(null);

  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePhotos, setReferencePhotos] = useState([]);
  const [mediaMode, setMediaMode] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Filtros
  const [refFilter, setRefFilter] = useState('none');
  const [camFilter, setCamFilter] = useState('none');
  const [showRefFilters, setShowRefFilters] = useState(false);
  const [showCamFilters, setShowCamFilters] = useState(false);

  // Teleprompter
  const [teleprompterText, setTeleprompterText] = useState('');
  const [showTeleprompterInput, setShowTeleprompterInput] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  const videoInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('duovideo_user');
    window.location.reload();
  };

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

  const refFilterCss = FILTERS.find(f => f.id === refFilter)?.css || 'none';
  const camFilterCss = FILTERS.find(f => f.id === camFilter)?.css || 'none';
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
            <div className="flex items-center justify-between">
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
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    Olá, <span className="font-medium text-foreground">{user.name.split(' ')[0]}</span>
                  </span>
                  <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors" title="Sair">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Coluna 1 — Referência */}
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
                  <button
                    onClick={() => setShowTeleprompterInput(v => !v)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${showTeleprompterInput ? 'bg-primary text-white border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />Teleprompter
                  </button>

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

              {showTeleprompterInput && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={teleprompterText}
                    onChange={e => setTeleprompterText(e.target.value)}
                    placeholder="Digite o texto que vai rolar na tela enquanto você grava..."
                    rows={4}
                    className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">{uploadError}</p>
                </div>
              )}

              <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
                <div className="relative">
                  {/* Aplica filtro CSS no container da referência */}
                  <div style={{ filter: refFilterCss, transition: 'filter 0.3s ease' }}>
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
                  </div>

                  {showTeleprompter && teleprompterText.trim() && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      <Teleprompter text={teleprompterText} isRecording={isRecordingActive} onClose={() => setShowTeleprompter(false)} />
                    </div>
                  )}
                </div>

                                {/* Filtros da referência — botão flutuante */}
                {mediaMode && (
                  <div className="flex flex-col gap-2 mt-1">
                    <button
                      onClick={() => setShowRefFilters(v => !v)}
                      className={`self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${showRefFilters ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}
                    >
                      🎨 Filtros
                    </button>
                    {showRefFilters && <FilterSelector value={refFilter} onChange={setRefFilter} />}
                  </div>
                )}

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
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
                <CameraRecorder
                  referenceFile={referenceForCamera}
                  referenceMode={mediaMode}
                  carouselRef={carouselRef}
                  referenceVideoRef={referenceVideoRef}
                  camFilterCss={camFilterCss}
                  onRecordingStart={() => {
                    carouselRef.current?.startRecording();
                    if (teleprompterText.trim()) setShowTeleprompter(true);
                    setIsRecordingActive(true);
                  }}
                />

                {/* Filtros da câmera */}
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    onClick={() => setShowCamFilters(v => !v)}
                    className={`self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${showCamFilters ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}
                  >
                    🎨 Filtros câmera
                  </button>
                  {showCamFilters && <FilterSelector value={camFilter} onChange={setCamFilter} />}
                </div>
              </div>
            </motion.section>
          </div>
        </main>

        <footer className="border-t border-border py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Desenvolvido por <span className="text-primary">CRIAR.IA TECNOLOGIA</span> | criarhub.com © 2026
            </p>
            <button onClick={() => setShowContact(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-4 h-4" />Fale Conosco
            </button>
          </div>
        </footer>
      </div>

      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} user={user} />
    </>
  );
}
