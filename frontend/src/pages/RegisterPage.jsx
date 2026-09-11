import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Sparkles, User, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = '/api';

export default function RegisterPage({ onRegistered }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Por favor, preencha nome e email.');
      return;
    }
    if (!email.includes('@')) {
      setError('Por favor, insira um email válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error('Erro ao cadastrar.');
      const data = await res.json();
      // Salva no localStorage para não pedir de novo
      localStorage.setItem('duovideo_user', JSON.stringify({ id: data.id, name: data.name, email: data.email }));
      onRegistered(data);
    } catch (err) {
      setError('Não foi possível cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">DuoVideo</h1>
            <p className="text-sm font-medium text-primary flex items-center justify-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" />
              CRIAR.IA TECNOLOGIA
            </p>
          </div>
        </div>

        {/* Card de cadastro */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-lg flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Bem-vindo!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cadastre-se para começar a criar seus duets.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Nome */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cadastrando...</>
              ) : (
                <>Entrar no DuoVideo<ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Seus dados são usados apenas para melhorar o app. Não enviamos spam.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          CRIAR.IA TECNOLOGIA | criarhub.com © 2026
        </p>
      </motion.div>
    </div>
  );
}
