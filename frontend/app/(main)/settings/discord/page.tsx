'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, ArrowLeft, MessageSquare, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Integration {
  discordUserId: string;
  createdAt: string;
}

export default function DiscordSettingsPage() {
  const { isAuthenticated } = useAuthStore();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/integrations/discord/me');
      setIntegration(r.data?.integration || null);
    } catch {
      setIntegration(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

  const link = async () => {
    if (!/^[A-Z0-9]{6,8}$/i.test(code.trim())) {
      toast.error('Code should be 6 letters/numbers (no spaces)');
      return;
    }
    setLinking(true);
    try {
      await api.post('/integrations/discord/link', { code: code.trim() });
      toast.success('Discord linked!');
      setCode('');
      void load();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to link Discord'
      );
    } finally {
      setLinking(false);
    }
  };

  const unlink = async () => {
    if (!confirm('Unlink your Discord account?')) return;
    try {
      await api.delete('/integrations/discord/me');
      setIntegration(null);
      toast.success('Discord unlinked');
    } catch {
      toast.error('Failed to unlink');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Sign in to manage integrations.</p>
        <Link href="/login" className="text-purple-300 hover:underline">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Settings
      </Link>
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-5 h-5 text-purple-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Integrations</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Discord</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Link your Discord account to use the <code className="font-mono text-xs">/music</code> bot in any server.
      </p>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
        </div>
      ) : integration ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            <h2 className="text-lg font-semibold text-white">Linked</h2>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Discord user <span className="font-mono text-white">{integration.discordUserId}</span> · linked {new Date(integration.createdAt).toLocaleDateString()}
          </p>
          <button
            onClick={unlink}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-full border border-rose-500/40 text-sm text-rose-200 hover:bg-rose-500/10"
          >
            <X className="w-4 h-4" /> Unlink
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
          <ol className="space-y-3 text-sm text-[hsl(var(--muted-foreground))] mb-5 list-decimal list-inside">
            <li>In any Discord server with the <span className="text-white">MakeYourMusic bot</span>, run <code className="font-mono text-white bg-[hsl(var(--background))] px-1.5 py-0.5 rounded">/music link</code>.</li>
            <li>The bot will reply with a 6-character code (only you can see it).</li>
            <li>Paste the code below.</li>
          </ol>

          <label className="block text-xs font-medium text-white mb-1.5">Link code</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={link}
              disabled={linking || !code.trim()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold disabled:opacity-50"
            >
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
