'use client';

import { useState } from 'react';
import { GitBranch, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/lib/store/toastStore';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const MOOD_OPTIONS = ['', 'happy', 'sad', 'energetic', 'calm', 'dark', 'dreamy', 'epic', 'nostalgic'];
const ENERGY_OPTIONS = ['', 'low', 'medium', 'high', 'explosive'];

interface MyAgent {
  id: string;
  name: string;
  slug: string;
}

export function RemixButton({ trackSlug, trackTitle }: { trackSlug: string; trackTitle: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<MyAgent[]>([]);
  const [agentId, setAgentId] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const openDialog = async () => {
    if (!isAuthenticated) {
      router.push(`/register?next=${encodeURIComponent(`/track/${trackSlug}`)}`);
      return;
    }
    setOpen(true);
    try {
      const r = await api.get<{ agents: MyAgent[] }>('/agents/mine');
      const list = r.data?.agents || [];
      setAgents(list);
      const first = list[0];
      if (first && !agentId) setAgentId(first.id);
    } catch {
      // Silent — the form will surface the empty-agents state.
    }
  };

  const submit = async () => {
    if (!agentId) {
      toast.error('Pick an agent to credit the remix to.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/tracks/${trackSlug}/remix`, {
        agentId,
        mood: mood || undefined,
        energy: energy || undefined,
        note: note.trim() || undefined,
      });
      toast.success('Remix queued — find it under your studio drafts.');
      setOpen(false);
      router.push('/studio');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to start remix');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Remix this track"
        aria-label="Remix this track"
        className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-emerald-300 hover:border-emerald-400/40 transition-colors"
      >
        <GitBranch className="w-5 h-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-[color:var(--stroke)] bg-[hsl(var(--card))] p-6">
          <DialogTitle className="text-lg font-bold text-white">Remix this track</DialogTitle>
          <DialogDescription className="text-sm text-[hsl(var(--muted-foreground))]">
            Build on &ldquo;{trackTitle}&rdquo; with your own twist. Your remix lives in your drafts
            until you publish.
          </DialogDescription>
          <div className="mt-4 space-y-4">
            {agents.length === 0 ? (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                You need at least one agent first.{' '}
                <a href="/creator" className="underline">
                  Create one
                </a>
                .
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
                    Agent
                  </span>
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-white border border-[color:var(--stroke)] focus:border-emerald-400 outline-none"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
                      New mood
                    </span>
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-white border border-[color:var(--stroke)] focus:border-emerald-400 outline-none"
                    >
                      {MOOD_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m || 'Keep original'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
                      Energy
                    </span>
                    <select
                      value={energy}
                      onChange={(e) => setEnergy(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-lg bg-[color:var(--bg-elev-2)] text-white border border-[color:var(--stroke)] focus:border-emerald-400 outline-none"
                    >
                      {ENERGY_OPTIONS.map((e) => (
                        <option key={e} value={e}>
                          {e || 'Keep original'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)]">
                    Note (optional, ≤280 chars)
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 280))}
                    placeholder="e.g. flipped to lo-fi for late-night listening"
                    rows={3}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-[color:var(--bg-elev-2)] text-white border border-[color:var(--stroke)] focus:border-emerald-400 outline-none text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="mym-cta w-full justify-center disabled:opacity-50"
                >
                  {busy ? 'Queuing…' : 'Start remix'}
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-3 right-3 text-[color:var(--text-mute)] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
