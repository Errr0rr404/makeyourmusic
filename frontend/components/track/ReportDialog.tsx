'use client';

import { useState } from 'react';
import { X, Flag, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/lib/store/toastStore';

const REASONS = [
  { id: 'copyright', label: 'Copyright infringement' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate-speech', label: 'Hate speech' },
  { id: 'sexual-content', label: 'Sexually explicit content' },
  { id: 'violence', label: 'Violence or graphic content' },
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'other', label: 'Something else' },
];

interface Props {
  targetId: string;
  targetType: 'track' | 'comment';
  targetTitle: string;
  open: boolean;
  onClose: () => void;
}

export function ReportDialog({ targetId, targetType, targetTitle, open, onClose }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setReason(null);
    setNotes('');
    setSubmitted(false);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setError('');
    setSubmitting(true);
    try {
      // Currently only track reports are supported on the backend
      const path =
        targetType === 'track'
          ? `/tracks/${targetId}/report`
          : `/social/comments/${targetId}/report`;
      await api.post(path, { reason, notes: notes.trim() || undefined });
      setSubmitted(true);
      toast.success('Report submitted — thank you');
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Report this {targetType}</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[260px]">
                {targetTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Report received</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
              Our moderators will review it. You won&apos;t hear back unless they need more info.
            </p>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))] tracking-wider mb-2 block">
                Reason
              </label>
              <div className="space-y-1">
                {REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReason(r.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-colors ${
                      reason === r.id
                        ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))] text-white'
                        : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        reason === r.id ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]' : 'border-[hsl(var(--muted-foreground))]'
                      }`}
                    />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))] tracking-wider mb-1.5 block">
                More detail <span className="text-[hsl(var(--muted-foreground))]/60 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Anything else we should know?"
                className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-right mt-1">{notes.length}/1000</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-[hsl(var(--border))]">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Flag className="w-4 h-4" />
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
