'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PublishGenerationDialog } from '@/components/studio/PublishGenerationDialog';
import { toast } from 'sonner';
import {
  Sparkles, Wand2, Clock, Loader2, CheckCircle2, AlertCircle, XCircle,
  Play, Globe, LockKeyhole, Trash2, Upload, RefreshCw, Lock, Repeat2,
} from 'lucide-react';

interface Gen {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  title?: string | null;
  prompt?: string | null;
  audioUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  durationSec?: number | null;
  isInstrumental: boolean;
  agent?: { id: string; name: string; slug: string; avatar: string | null } | null;
  track?: { id: string; slug: string; title: string; isPublic: boolean } | null;
  providerModel?: string | null;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: 'FREE' | 'PREMIUM';
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: Gen['status'] }) {
  const config = {
    PENDING: { label: 'Queued', color: 'bg-amber-500/10 text-amber-300', Icon: Clock },
    PROCESSING: { label: 'Generating', color: 'bg-blue-500/10 text-blue-300', Icon: Loader2 },
    COMPLETED: { label: 'Ready', color: 'bg-green-500/10 text-green-300', Icon: CheckCircle2 },
    FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-300', Icon: XCircle },
  }[status];
  const { Icon } = config;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

export default function GenerationsPage() {
  const confirm = useConfirm();
  const { isAuthenticated } = useAuthStore();
  const [generations, setGenerations] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [publishGen, setPublishGen] = useState<Gen | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [genRes, usageRes] = await Promise.allSettled([
        api.get('/ai/generations?limit=50'),
        api.get('/ai/usage'),
      ]);
      if (genRes.status === 'fulfilled') {
        setGenerations(genRes.value.data.music || []);
      } else {
        setError((genRes.reason as any)?.response?.data?.error || 'Failed to load generations');
      }
      if (usageRes.status === 'fulfilled') {
        setUsage(usageRes.value.data.usage);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load generations');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll if any are in progress
  useEffect(() => {
    if (!generations.some((g) => g.status === 'PENDING' || g.status === 'PROCESSING')) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [generations, load]);

  const handleVariation = async (gen: Gen) => {
    try {
      const res = await api.post(`/ai/generations/${gen.id}/variation`);
      setGenerations((prev) => [res.data.generation, ...prev]);
      toast.success('New variation started — it will appear at the top');
    } catch (err: any) {
      if (err.response?.status === 429) {
        toast.error(err.response.data?.error || 'Daily limit reached');
      } else {
        toast.error(err.response?.data?.error || 'Could not create variation');
      }
    }
  };

  const handleDelete = async (gen: Gen) => {
    const ok = await confirm({
      title: `Delete "${gen.title || 'untitled generation'}"?`,
      message: gen.track
        ? 'The generation will be removed from your history, but the published track will remain.'
        : 'The generation audio will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/ai/generations/${gen.id}`);
      setGenerations((prev) => prev.filter((g) => g.id !== gen.id));
      toast.success('Generation deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your Generations</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to see your AI generations</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">My generations</h1>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {usage && (
            <div className="mr-auto sm:mr-0 sm:text-right">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Today</p>
              <p className="text-lg font-bold text-white">
                {usage.used}<span className="text-white/40">/{usage.limit}</span>
              </p>
            </div>
          )}
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:scale-105 transition-transform"
          >
            <Wand2 className="w-4 h-4" /> New track
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 p-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline hover:text-red-300">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[hsl(var(--card))] animate-pulse" />
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <Wand2 className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No generations yet</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Start creating music with AI
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold"
          >
            <Wand2 className="w-4 h-4" /> Create your first track
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {generations.map((gen) => (
            <li
              key={gen.id}
              className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-semibold text-white truncate">
                      {gen.title || <span className="text-[hsl(var(--muted-foreground))]">Untitled</span>}
                    </h3>
                    <StatusBadge status={gen.status} />
                    {gen.track && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white/70 bg-white/5">
                        {gen.track.isPublic ? <Globe className="w-3 h-3" /> : <LockKeyhole className="w-3 h-3" />}
                        {gen.track.isPublic ? 'Public' : 'Private'}
                      </span>
                    )}
                  </div>
                  {gen.prompt && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">{gen.prompt}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{timeAgo(gen.createdAt)}</span>
                    {gen.durationSec && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(gen.durationSec / 60)}:{(gen.durationSec % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                    {gen.isInstrumental && <span>· Instrumental</span>}
                    {gen.providerModel && <span>· {gen.providerModel}</span>}
                  </div>

                  {gen.status === 'COMPLETED' && gen.audioUrl && (
                    <audio controls src={gen.audioUrl} className="w-full mt-3" />
                  )}

                  {gen.status === 'FAILED' && (
                    <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{gen.errorMessage || 'Unknown error'}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-col sm:flex-shrink-0">
                  {gen.status === 'COMPLETED' && gen.audioUrl && !gen.track && (
                    <button
                      onClick={() => setPublishGen(gen)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-medium hover:bg-[hsl(var(--primary))]/90"
                      title="Publish as track"
                    >
                      <Upload className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  {gen.status === 'COMPLETED' && gen.audioUrl && (
                    <button
                      onClick={() => handleVariation(gen)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-200 border border-purple-500/30 text-xs font-medium hover:bg-purple-500/25"
                      title="Generate a new take with these lyrics"
                    >
                      <Repeat2 className="w-3.5 h-3.5" /> Variation
                    </button>
                  )}
                  {gen.track && (
                    <Link
                      href={`/track/${gen.track.slug}`}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium"
                    >
                      <Play className="w-3.5 h-3.5" /> Open
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(gen)}
                    className="flex items-center justify-center p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                    aria-label={`Delete ${gen.title || 'generation'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {publishGen && (
        <PublishGenerationDialog
          generation={publishGen}
          open
          onClose={() => setPublishGen(null)}
          onPublished={(track) => {
            setGenerations((prev) =>
              prev.map((g) =>
                g.id === publishGen.id
                  ? { ...g, track: { id: track.id, slug: track.slug, title: track.title, isPublic: track.isPublic } }
                  : g,
              ),
            );
            setPublishGen(null);
          }}
        />
      )}
    </div>
  );
}
