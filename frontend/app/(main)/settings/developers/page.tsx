'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Trash2, Plus, Key, Eye, EyeOff } from 'lucide-react';

interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// Developer settings: list / create / revoke API keys for the public API.
// Raw keys are only returned at creation time and shown once — we surface
// that flow via a one-time modal so the user knows to copy it.
export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ keys: ApiKeySummary[] }>('/v1/keys');
      setKeys(data.keys);
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post<{ key: ApiKeySummary; secret: string }>('/v1/keys', {
        name: newName.trim(),
      });
      setRevealed({ name: data.key.name, secret: data.secret });
      setNewName('');
      await load();
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this key? Apps using it will stop working immediately.')) return;
    try {
      await api.delete(`/v1/keys/${id}`);
      toast.success('Key revoked');
      await load();
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to revoke key');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Key className="w-6 h-6" /> Developer keys
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
          Programmatic access to the music4ai API. Use these keys with the{' '}
          <code className="font-mono">@music4ai/sdk</code> package or any HTTP client.
        </p>
      </header>

      <form onSubmit={create} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Key name (e.g. Local dev, Production)"
          className="flex-1 px-3 py-2 rounded-md bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--border))]"
          maxLength={60}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No API keys yet.</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md bg-[hsl(var(--bg-elev-1))] border border-[hsl(var(--border))]"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{k.name}</p>
                <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                  {k.prefix}…{' '}
                  {k.lastUsedAt
                    ? `· last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : '· never used'}
                  {k.revokedAt && ' · REVOKED'}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => revoke(k.id)}
                  className="p-2 rounded hover:bg-red-500/10 text-red-400"
                  title="Revoke"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {revealed && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--bg-elev-2))] border border-[hsl(var(--border))] rounded-lg max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Your new key — copy it now</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              This is the only time we&apos;ll show <strong>{revealed.name}</strong>&apos;s secret.
              Store it in your password manager or a server env var.
            </p>
            <div className="relative">
              <input
                readOnly
                type={secretVisible ? 'text' : 'password'}
                value={revealed.secret}
                className="w-full pl-3 pr-20 py-2 rounded-md bg-black/40 border border-[hsl(var(--border))] font-mono text-xs"
              />
              <div className="absolute right-1 top-1 flex gap-1">
                <button
                  className="p-1.5 rounded hover:bg-white/10"
                  onClick={() => setSecretVisible((v) => !v)}
                  type="button"
                >
                  {secretVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  className="p-1.5 rounded hover:bg-white/10"
                  onClick={async () => {
                    await navigator.clipboard.writeText(revealed.secret);
                    toast.success('Copied');
                  }}
                  type="button"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              onClick={() => {
                setRevealed(null);
                setSecretVisible(false);
              }}
            >
              I&apos;ve copied it
            </button>
          </div>
        </div>
      )}

      <section className="pt-6 border-t border-[hsl(var(--border))] text-sm space-y-2">
        <h3 className="font-semibold">Quick start</h3>
        <pre className="bg-[hsl(var(--bg-elev-1))] p-3 rounded-md text-xs overflow-x-auto">
          {`import { Music4AI } from '@music4ai/sdk';
const client = new Music4AI({ apiKey: process.env.MUSIC4AI_KEY! });
const { generation } = await client.music.generate({
  prompt: 'lo-fi study beat, 70 bpm', isInstrumental: true,
});
const final = await client.music.waitFor(generation.id);
console.log(final.audioUrl);`}
        </pre>
      </section>
    </div>
  );
}
