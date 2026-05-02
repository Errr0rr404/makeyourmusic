'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { Loader2, Plus, Trash2, Wand2, ArrowLeft, AlertCircle, Sparkles, Music2 } from 'lucide-react';

interface TrainingExample {
  audioUrl: string;
  description?: string;
  addedAt: string;
}

interface AgentSummary {
  id: string;
  name: string;
  slug: string;
}

interface TrainingState {
  agent: { id: string; name: string };
  examples: TrainingExample[];
  styleProfile: string | null;
  styleProfileVersion: number;
}

export function TrainingClient({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuthStore();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [state, setState] = useState<TrainingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [draftUrl, setDraftUrl] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [deriving, setDeriving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Resolve the agent id by slug from /api/agents/:slug.
        const r = await api.get(`/agents/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        const agent: AgentSummary | null = r.data?.agent || null;
        if (!agent) {
          setError('Agent not found');
          setLoading(false);
          return;
        }
        setAgentId(agent.id);
        const t = await api.get(`/agent-training/${agent.id}`);
        if (cancelled) return;
        setState(t.data);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to load training state'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (isAuthenticated) void load();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [slug, isAuthenticated]);

  const addExample = async () => {
    if (!agentId) return;
    if (!/^https?:\/\//i.test(draftUrl.trim())) {
      toast.error('Provide a public https audio URL');
      return;
    }
    setAdding(true);
    try {
      const r = await api.post(`/agent-training/${agentId}/examples`, {
        audioUrl: draftUrl.trim(),
        description: draftDesc.trim() || undefined,
      });
      const examples: TrainingExample[] = r.data?.examples || [];
      setState((s) => (s ? { ...s, examples, styleProfile: null } : s));
      setDraftUrl('');
      setDraftDesc('');
      toast.success('Example added — re-train to refresh the style profile');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to add example'
      );
    } finally {
      setAdding(false);
    }
  };

  const removeExample = async (idx: number) => {
    if (!agentId) return;
    try {
      const r = await api.delete(`/agent-training/${agentId}/examples/${idx}`);
      const examples: TrainingExample[] = r.data?.examples || [];
      setState((s) => (s ? { ...s, examples, styleProfile: null } : s));
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to remove example'
      );
    }
  };

  const derive = async () => {
    if (!agentId) return;
    setDeriving(true);
    try {
      const r = await api.post(`/agent-training/${agentId}/derive`);
      const profile: string = r.data?.styleProfile || '';
      const version: number = r.data?.styleProfileVersion || 0;
      setState((s) => (s ? { ...s, styleProfile: profile, styleProfileVersion: version } : s));
      toast.success('Style profile updated — every new track under this agent will follow it');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        toast.error('Daily derive cap reached');
      } else {
        toast.error(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to derive profile'
        );
      }
    } finally {
      setDeriving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Sign in to train your agents.</p>
        <Link href={`/login?redirect=/creator/agents/${slug}/training`} className="text-purple-300 hover:underline">Log in</Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto" />
      </div>
    );
  }
  if (error || !state) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{error || 'Failed to load'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Link
        href={`/agent/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to agent
      </Link>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Custom training</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Train {state.agent.name}</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Add 3–10 reference tracks. We synthesize a style profile from your descriptions and lock it into the agent.
        Every new track under this agent reads the profile, keeping its sonic identity consistent.
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-4">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Music2 className="w-4 h-4 text-purple-300" />
          Reference tracks ({state.examples.length}/10)
        </h2>

        {state.examples.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">No examples yet.</p>
        )}

        <ul className="space-y-2 mb-4">
          {state.examples.map((ex, idx) => (
            <li
              key={`${idx}-${ex.audioUrl}`}
              className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={ex.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-300 hover:underline font-mono truncate block"
                >
                  {ex.audioUrl}
                </a>
                <p className="text-sm text-white mt-1 whitespace-pre-line">
                  {ex.description || <span className="text-[hsl(var(--muted-foreground))] italic">No description</span>}
                </p>
              </div>
              <button
                onClick={() => removeExample(idx)}
                className="p-2 text-rose-300 hover:bg-rose-500/10 rounded-lg flex-shrink-0"
                aria-label="Remove example"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>

        {state.examples.length < 10 && (
          <div className="space-y-2 pt-3 border-t border-[hsl(var(--border))]">
            <input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/.../reference.mp3"
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm font-mono"
            />
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Describe what makes this track representative (instruments, production, vocal qualities…). Without descriptions the profile is weaker."
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none"
            />
            <button
              onClick={addExample}
              disabled={adding || !draftUrl.trim()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add example
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-300" />
            Style profile {state.styleProfileVersion > 0 ? `· v${state.styleProfileVersion}` : ''}
          </h2>
          <button
            onClick={derive}
            disabled={deriving || state.examples.length === 0}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {deriving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {state.styleProfile ? 'Re-train' : 'Train profile'}
          </button>
        </div>
        {state.styleProfile ? (
          <div className="rounded-lg bg-[hsl(var(--background))] p-4 text-sm text-white whitespace-pre-line">
            {state.styleProfile}
          </div>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {state.examples.length === 0
              ? 'Add at least one example, then click Train profile.'
              : 'No profile yet. Click Train profile to derive one from your examples.'}
          </p>
        )}
      </div>
    </div>
  );
}
