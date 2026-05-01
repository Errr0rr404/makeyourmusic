'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { X, Loader2, Wand2 } from 'lucide-react';

interface Props {
  generationId: string;
  generationTitle: string;
  open: boolean;
  onClose: () => void;
  onStarted: (newGeneration: Record<string, unknown>) => void;
}

const MAX_LYRICS = 6000;
const MAX_INSTRUCTIONS = 500;

export function ExtendGenerationDialog({
  generationId,
  generationTitle,
  open,
  onClose,
  onStarted,
}: Props) {
  const [extraLyrics, setExtraLyrics] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    if (!extraLyrics.trim() && !instructions.trim()) {
      setError('Add lyrics for the new section or instructions for an outro');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post(`/ai/generations/${generationId}/extend`, {
        extraLyrics: extraLyrics.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      toast.success('Extension started — the new track will appear at the top');
      onStarted(res.data.generation);
      setExtraLyrics('');
      setInstructions('');
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to start extension';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Extend track</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-[24rem]">
              {generationTitle || 'Untitled'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              New section lyrics <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
            </label>
            <textarea
              value={extraLyrics}
              onChange={(e) => setExtraLyrics(e.target.value.slice(0, MAX_LYRICS))}
              placeholder={'[Verse 3]\nNew section lyrics here…'}
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 resize-none"
            />
            <div className="text-xs text-right text-[hsl(var(--muted-foreground))] mt-1">
              {extraLyrics.length}/{MAX_LYRICS}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Instructions <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional, e.g. &ldquo;add a 30s outro that fades out&rdquo;)</span>
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS))}
              placeholder="e.g. fade out with reverb-soaked vocals"
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Extend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
