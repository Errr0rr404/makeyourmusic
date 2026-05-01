'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Public DMCA-style takedown form. Anyone can file — login is optional. We
// hide the named track immediately and queue admin review. Withdrawing or
// rejecting restores visibility; accepting permanently removes.
export default function TakedownPage() {
  const [trackId, setTrackId] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 20) {
      toast.error('Please explain in at least a couple sentences (20+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<{ id: string; status: string }>('/takedowns', {
        trackId: trackId.trim(),
        reason: reason.trim(),
        claimantName: claimantName.trim(),
        claimantEmail: claimantEmail.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      setSubmittedId(data.id);
      toast.success('Takedown filed — the track has been hidden pending review.');
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to file takedown');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Takedown received</h1>
        <p>Your reference ID is <code className="font-mono">{submittedId}</code>.</p>
        <p>The track is hidden from public listings while we review the claim. You&apos;ll receive a follow-up at the email you provided.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Report a copyright issue</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
          File a DMCA-style takedown for content you believe infringes your copyright.
          Submitting in bad faith may have legal consequences.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Track ID or URL" required>
          <input
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            placeholder="e.g. ckxyz123 or https://makeyourmusic.ai/track/some-slug"
            required
            className="form-input"
          />
        </Field>

        <Field label="Your full name" required>
          <input
            value={claimantName}
            onChange={(e) => setClaimantName(e.target.value)}
            required
            className="form-input"
          />
        </Field>

        <Field label="Your email" required>
          <input
            type="email"
            value={claimantEmail}
            onChange={(e) => setClaimantEmail(e.target.value)}
            required
            className="form-input"
          />
        </Field>

        <Field label="Evidence URL (optional)" hint="Link to the original work, registration, or other proof.">
          <input
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            className="form-input"
          />
        </Field>

        <Field label="Why this content infringes your rights" required>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
            minLength={20}
            required
            className="form-input"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Minimum 20 characters. Be specific about which work is yours and which part of the track infringes it.
          </p>
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Filing...' : 'File takedown'}
        </button>
      </form>

      <style jsx>{`
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          background: hsl(var(--bg-elev-2, 240 4% 12%));
          border: 1px solid hsl(var(--border));
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      {children}
      {hint && (
        <span className="block text-xs text-[hsl(var(--muted-foreground))] mt-1">{hint}</span>
      )}
    </label>
  );
}
