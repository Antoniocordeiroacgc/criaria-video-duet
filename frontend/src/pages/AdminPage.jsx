import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Trash2, LogOut, RefreshCw, Shield, Video, CheckCircle2, XCircle, Clock } from 'lucide-react';

const API = '/api/admin';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(false);

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
      const [u, m, s, j] = await Promise.all([
        fetch(`${API}/users`, { headers: h }).then(r => r.json()),
        fetch(`${API}/messages`, { headers: h }).then(r => r.json()),
        fetch(`${API}/stats`, { headers: h }).then(r => r.json()),
        fetch(`${API}/jobs`, { headers: h }).then(r => r.json()),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setMessages(Array.isArray(m) ? m : []);
      setStats(s);
      setJobs(Array.isArray(j) ? j : []);
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

  const formatDate = (str) => str ? new Date(str).toLocaleString('pt-BR') : '-';

  const statusIcon = (s) => {
    if (s === 'done') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const statusLabel = (s) => ({ done: 'Concluído', failed: 'Erro', processing: 'Processando', pending: 'Na fila', uploading: 'Enviando' }[s] || s);
  const statusColor = (s) => ({ done: 'text-green-500', failed: 'text-destructive', processing: 'text-yellow-500' }[s] || 'text-muted-foreground');

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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: <Users className="w-5 h-5 text-primary" />, value: stats.total_users, label: 'Usuários' },
              { icon: <MessageCircle className="w-5 h-5 text-foreground" />, value: stats.total_messages, label: 'Mensagens' },
              { icon: <Video className="w-5 h-5 text-blue-500" />, value: stats.total_jobs, label: 'Total Duets' },
              { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, value: stats.jobs_done, label: 'Concluídos' },
              { icon: <XCircle className="w-5 h-5 text-destructive" />, value: stats.jobs_failed, label: 'Com erro' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {s.icon}
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {[{ key: 'users', label: `Usuários (${users.length})` }, { key: 'jobs', label: `Duets (${jobs.length})` }, { key: 'messages', label: `Mensagens (${messages.length})` }].map(t => (
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
                  <span className="text-xs text-muted-foreground">{formatDate(j.created_at)}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded-full">{j.reference_type === 'image' ? `📷 ${j.reference_count} foto(s)` : '🎬 Vídeo'}</span>
                  <span className="bg-muted px-2 py-0.5 rounded-full">{j.layout === 'top_bottom' ? '↕ Top/Bottom' : '↔ Side/Side'}</span>
                  {j.status === 'processing' && <span className="bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">{j.progress_pct}%</span>}
                </div>
                {j.error_message && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 truncate">{j.error_message}</p>}
                <p className="text-xs text-muted-foreground font-mono">ID: {j.id.slice(0, 8)}...</p>
              </div>
            ))}
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
