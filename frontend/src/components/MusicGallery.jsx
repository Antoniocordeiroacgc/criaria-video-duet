import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Check, X, Loader2 } from 'lucide-react';

const API = '/api/music';

export default function MusicGallery({ onSelect, selectedId, onClose }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => { setTracks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const togglePlay = (track) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = `${API}/${track.id}/stream`;
        audioRef.current.play().catch(() => {});
      }
      setPlayingId(track.id);
    }
  };

  const genres = ['Todos', ...new Set(tracks.map(t => t.genre).filter(Boolean))];
  const [genreFilter, setGenreFilter] = useState('Todos');

  const filtered = genreFilter === 'Todos' ? tracks : tracks.filter(t => t.genre === genreFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Galeria de Músicas</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtro de gênero */}
        {genres.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3 pb-0">
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${genreFilter === g ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border'}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm">
              Nenhuma música disponível ainda.
            </p>
          )}

          {filtered.map(track => (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedId === track.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              onClick={() => onSelect(track)}
            >
              <button
                onClick={e => { e.stopPropagation(); togglePlay(track); }}
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors"
              >
                {playingId === track.id
                  ? <Pause className="w-4 h-4 text-primary fill-current" />
                  : <Play className="w-4 h-4 text-primary fill-current" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artist || 'Desconhecido'}{track.genre ? ` · ${track.genre}` : ''}
                </p>
              </div>

              {selectedId === track.id && (
                <Check className="w-5 h-5 text-primary shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex gap-2">
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sem música
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
