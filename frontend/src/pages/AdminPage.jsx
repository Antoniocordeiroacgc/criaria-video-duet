import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Trash2, LogOut, RefreshCw, Shield, Video, CheckCircle2, XCircle, Clock, Download, Music, Upload, Loader2 } from 'lucide-react';

const API = '/api/admin';
const API_BASE = '/api';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(false);

  // Upload de música
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [musicGenre, setMusicGenre] = useState('');
  const [musicFile, setMusicFile] = useState(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const headers = { 'x-admin-password': password };

  const login = async () => {
    setAuthError(null);
    try {
      const res = await fetch(`${API}/stats`, { headers: { 'x-admin-password': password } });
      if (res.status === 401) { setAuthError('Senha incorreta.'); return; }
      setAuthed(true);
      loadAll(password);
    } catch { setAuthError('Erro ao conectar.'); }
  };

  const loadAll = async (pwd = password) => {
    setLoading(true);
    const h = { 'x-admin-password': pwd };
    try {
      const [u, m, s, j, t] = await Promise.all([
        fetch(`${API}/users`, { headers: h }).then(r => r.json()),
        fetch(`${API}/messages`, { headers: h }).then(r => r.json()),
        fetch(`${API}/stats`, { headers: h }).then(r => r.json()),
        fetch(`${API}/jobs`, { headers: h }).then(r => r.json()),
        fetch(`${API}/music`, { headers: h }).then(r => r.json()),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setMessages(Array.isArray(m) ? m : []);
      setStats(s);
      setJobs(Array.isArray(j) ? j : []);
      setTracks(Array.isArray(t) ? t : []);
    } catch {}
    setLoading(false);
  };

  const deleteUser = async (id) => {
    if (!confirm('Excluir este usuário?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE', headers });
    setUsers(u => u.filter(x => x.id !== id));
    setStats(s => ({ ...s, total_users: s.total_users - 1 }));
  };

  const deleteMessage = async (id) => {
    if (!confirm('Excluir esta mensagem?')) return;
    await fetch(`${API}/messages/${id}`, { method: 'DELETE', headers });
    setMessages(m => m.filter(x => x.id !== id));
    setStats(s => ({ ...s, total_messages: s.total_messages - 1 }));
  };

  const deleteJob = async (id) => {
    if (!confirm('Excluir este duet?')) return;
    await fetch(`${API}/jobs/${id}`, { method: 'DELETE', headers });
    setJobs(j => j.filter(x => x.id !== id));
    setStats(s => ({ ...s, total_jobs: s.total_jobs - 1 }));
  };

  const deleteTrack = async (id) => {
    if (!confirm('Excluir esta música?')) return;
    await fetch(`${API}/music/${id}`, { method: 'DELETE', headers });
    setTracks(t => t.filter(x => x.id !== id));
  };

  const uploadMusic = async () => {
    if (!musicFile || !musicTitle.trim()) return;
    setUploadingMusic(true);
    setUploadSuccess(false);
    try {
      const fd = new FormData();
      fd.append('file', musicFile, musicFile.name);
      fd.append('title', musicTitle.trim());
      fd.append('artist', musicArtist.trim());
      fd.append('genre', musicGenre.trim());
      const res = await fetch(`${API}/music`, { method: 'POST', headers, body: fd });
      if (res.ok) {
        const data = await res.json();
        setTracks(t => [{ id: data.id, title: musicTitle, artist: musicArtist, genre: musicGenre, file_key: data.file_key }, ...t]);
        setMusicTitle(''); setMusicArtist(''); setMusicGenre(''); setMusicFile(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch {}
    setUploadingMusic(false);
  };

  const formatDate = (str) => str ? new Date(str).toLocaleString('pt-BR') : '-';
  const statusIcon = (s) => {
    const sl = s?.toLowerCase();
    if (sl === 'done') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (sl === 'failed') return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };
  const statusLabel = (s) => ({ done: 'Concluído', failed: 'Erro', processing: 'Processando', pending: 'Na fila', uploading: 'Enviando' }[s?.toLowerCase()] || s);
  const statusColor = (s) => ({ done: 'text-green-500', failed: 'text-destructive', processing: 'text-yellow-500' }[s?.toLowerCase()] || 'text-muted-foreground');

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin DuoVideo</h1>
            <p className="text-sm text-muted-foreground">Digite a senha para continuar</p>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Senha admin" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {authError && <p className="text-sm text-destructive text-center">{authError}</p>}
          <button onClick={login} className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors">Entrar</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Dashboard Admin — DuoVideo</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadAll()} className="text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setAuthed(false)} className="text-muted-foreground hover:text-foreground transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { icon: <Users className="w-5 h-5 text-primary" />, value: stats.total_users, label: 'Usuários' },
              { icon: <MessageCircle className="w-5 h-5 text-foreground" />, value: stats.total_messages, label: 'Mensagens' },
              { icon: <Video className="w-5 h-5 text-blue-500" />, value: stats.total_jobs, label: 'Total Duets' },
              { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, value: stats.jobs_done, label: 'Concluídos' },
              { icon: <XCircle className="w-5 h-5 text-destructive" />, value: stats.jobs_failed, label: 'Com erro' },
              { icon: <Music className="w-5 h-5 text-purple-500" />, value: stats.total_music || 0, label: 'Músicas' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {s.icon}
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {[
            { key: 'users', label: `Usuários (${users.length})` },
            { key: 'jobs', label: `Duets (${jobs.length})` },
            { key: 'music', label: `Músicas (${tracks.length})` },
            { key: 'messages', label: `Mensagens (${messages.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="flex flex-col gap-3">
            {users.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>}
            {users.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                </div>
                <button onClick={() => deleteUser(u.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        {tab === 'jobs' && (
          <div className="flex flex-col gap-3">
            {jobs.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum duet gerado ainda.</p>}
            {jobs.map(j => (
              <div key={j.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {statusIcon(j.status)}
                    <span className={`text-sm font-medium ${statusColor(j.status)}`}>{statusLabel(j.status)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.status?.toLowerCase() === 'done' && (
                      <a href={`${API_BASE}/jobs/${j.id}/file`} download={`duet-${j.id.slice(0, 8)}.mp4`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                        <Download className="w-4 h-4" />Baixar
                      </a>
                    )}
                    <button onClick={() => deleteJob(j.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    <span className="text-xs text-muted-foreground">{formatDate(j.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded-full">{j.reference_type === 'image' ? `📷 ${j.reference_count} foto(s)` : '🎬 Vídeo'}</span>
                  <span className="bg-muted px-2 py-0.5 rounded-full">{j.layout === 'top_bottom' ? '↕ Top/Bottom' : '↔ Side/Side'}</span>
                  {j.status?.toLowerCase() === 'processing' && <span className="bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">{j.progress_pct}%</span>}
                </div>
                {j.error_message && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 truncate">{j.error_message}</p>}
                <p className="text-xs text-muted-foreground font-mono">ID: {j.id.slice(0, 8)}...</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'music' && (
          <div className="flex flex-col gap-6">
            {/* Upload de música */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Music className="w-4 h-4 text-primary" />Adicionar música</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={musicTitle} onChange={e => setMusicTitle(e.target.value)} placeholder="Título *" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input value={musicArtist} onChange={e => setMusicArtist(e.target.value)} placeholder="Artista" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <input value={musicGenre} onChange={e => setMusicGenre(e.target.value)} placeholder="Gênero (ex: Pop, Lofi)" className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  <Upload className="w-4 h-4" />
                  {musicFile ? musicFile.name : 'Escolher MP3'}
                  <input type="file" accept="audio/*" className="hidden" onChange={e => setMusicFile(e.target.files?.[0] || null)} />
                </label>
                <button
                  onClick={uploadMusic}
                  disabled={!musicFile || !musicTitle.trim() || uploadingMusic}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {uploadingMusic ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</> : 'Adicionar'}
                </button>
                {uploadSuccess && <span className="text-green-500 text-sm">✓ Adicionado!</span>}
              </div>
            </div>

            {/* Lista de músicas */}
            <div className="flex flex-col gap-3">
              {tracks.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma música na galeria ainda.</p>}
              {tracks.map(t => (
                <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist || 'Desconhecido'}{t.genre ? ` · ${t.genre}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteTrack(t.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'messages' && (
          <div className="flex flex-col gap-3">
            {messages.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhuma mensagem recebida.</p>}
            {messages.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.created_at)}</p>
                  </div>
                  <button onClick={() => deleteMessage(m.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
