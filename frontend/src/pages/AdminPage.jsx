import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Trash2, LogOut, RefreshCw, Shield } from 'lucide-react';

const API = '/api/admin';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(false);

  const headers = { 'x-admin-password': password, 'Content-Type': 'application/json' };

  const login = async () => {
    setAuthError(null);
    try {
      const res = await fetch(`${API}/stats`, { headers: { 'x-admin-password': password } });
      if (res.status === 401) { setAuthError('Senha incorreta.'); return; }
      const data = await res.json();
      setStats(data);
      setAuthed(true);
      loadAll();
    } catch {
      setAuthError('Erro ao conectar.');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, m, s] = await Promise.all([
        fetch(`${API}/users`, { headers }).then(r => r.json()),
        fetch(`${API}/messages`, { headers }).then(r => r.json()),
        fetch(`${API}/stats`, { headers }).then(r => r.json()),
      ]);
      setUsers(u);
      setMessages(m);
      setStats(s);
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

  const formatDate = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleString('pt-BR');
  };

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

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Senha admin"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {authError && <p className="text-sm text-destructive text-center">{authError}</p>}

          <button
            onClick={login}
            className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Entrar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Dashboard Admin — DuoVideo</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadAll} className="text-muted-foreground hover:text-foreground transition-colors" title="Atualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setAuthed(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total_users}</p>
                <p className="text-sm text-muted-foreground">Usuários cadastrados</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total_messages}</p>
                <p className="text-sm text-muted-foreground">Mensagens recebidas</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab('users')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Usuários ({users.length})
          </button>
          <button
            onClick={() => setTab('messages')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Mensagens ({messages.length})
          </button>
        </div>

        {/* Usuários */}
        {tab === 'users' && (
          <div className="flex flex-col gap-3">
            {users.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>}
            {users.map(u => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                </div>
                <button
                  onClick={() => deleteUser(u.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mensagens */}
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
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
