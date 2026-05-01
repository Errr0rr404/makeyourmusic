'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Loader2, Globe, LockKeyhole, Bot, Flame, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/upload/ImageUpload';

interface Agent {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
}
interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface GenerationLite {
  id: string;
  title?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
}

interface Props {
  generation: GenerationLite;
  open: boolean;
  onClose: () => void;
  onPublished: (track: { id: string; slug: string; title: string; isPublic: boolean }) => void;
}

export function PublishGenerationDialog({ generation, open, onClose, onPublished }: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [title, setTitle] = useState(generation.title || '');
  const [agentId, setAgentId] = useState('');
  const [genreId, setGenreId] = useState('');
  const [coverArt, setCoverArt] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(generation.title || '');
    api.get('/agents/mine').then((r) => setAgents(r.data.agents || [])).catch(() => {});
    api.get('/genres').then((r) => setGenres(r.data.genres || [])).catch(() => {});
  }, [open, generation.title]);

  useEffect(() => {
    if (agents.length > 0 && !agentId) setAgentId(agents[0]!.id);
  }, [agents, agentId]);

  if (!open) return null;

  const hasAgents = agents.length > 0;

  const handlePublish = async () => {
    if (!agentId) {
      toast.error('Pick which agent to publish under');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.post(`/ai/generations/${generation.id}/publish`, {
        title: title.trim(),
        agentId,
        genreId: genreId || undefined,
        coverArt: coverArt || undefined,
        isPublic,
      });
      toast.success('Track published!');
      onPublished(res.data.track);
      router.push(`/track/${res.data.track.slug}`);
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Publish track</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Add cover art, pick an agent, and share it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {generation.audioUrl && (
            <div className="p-3 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
              <audio controls src={generation.audioUrl} className="w-full" />
              {generation.durationSec && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(generation.durationSec / 60)}:
                  {(generation.durationSec % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Cover art</label>
              <ImageUpload
                value={coverArt}
                onChange={setCoverArt}
                aspectRatio="square"
                maxSizeMB={5}
                label="Upload"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Your track title"
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Genre</label>
                <select
                  value={genreId}
                  onChange={(e) => setGenreId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                >
                  <option value="">Select genre (optional)</option>
                  {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              <Bot className="w-4 h-4 inline mr-1 text-[hsl(var(--accent))]" />
              Publish under agent
            </label>
            {hasAgents ? (
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
              >
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <p className="text-amber-300 mb-2">You need an AI agent to publish.</p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-[hsl(var(--accent))] hover:underline text-xs"
                >
                  Create one in Creator Studio →
                </Link>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  isPublic
                    ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
                    : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] hover:border-white/20'
                }`}
              >
                <Globe
                  className={`w-4 h-4 mb-1 ${
                    isPublic ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                />
                <p className="text-sm font-semibold text-white">Public</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Anyone can play</p>
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  !isPublic
                    ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
                    : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] hover:border-white/20'
                }`}
              >
                <LockKeyhole
                  className={`w-4 h-4 mb-1 ${
                    !isPublic ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                />
                <p className="text-sm font-semibold text-white">Private</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Only on your profile</p>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-[hsl(var(--border))]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !hasAgents || !title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-transform"
          >
            {publishing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
            ) : (
              <><Flame className="w-4 h-4" /> Publish track</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
