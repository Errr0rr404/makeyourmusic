'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, X, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * One-shot banner shown right after a track is published. Appears when the
 * URL has `?published=1` (set by the create-page redirect), then strips the
 * flag from history so a refresh doesn't re-show it. Pushes the referral
 * link as the primary CTA — the highest-leverage moment to ask is the
 * dopamine high right after publishing.
 */
export function JustPublishedBanner({ trackUrl }: { trackUrl: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('published') !== '1') return;
    setVisible(true);
    track('referral_nudge_shown', { source: 'just_published' });
    // Remove the flag without a navigation so a refresh / back-forward
    // doesn't re-trigger.
    url.searchParams.delete('published');
    window.history.replaceState({}, '', url.toString());
  }, []);

  if (!visible) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + trackUrl : trackUrl;

  const onShare = async () => {
    track('share_track_clicked', { source: 'just_published' });
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ url: shareUrl, title: 'I just made a song' }); }
      catch { /* user cancelled */ }
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
    }
  };

  return (
    <div
      className="relative mb-6 rounded-2xl border p-4 sm:p-5"
      style={{
        background: 'linear-gradient(120deg, var(--brand-soft), color-mix(in srgb, var(--brand-2) 12%, transparent))',
        borderColor: 'var(--brand)',
        boxShadow: '0 18px 40px -22px var(--brand-glow)',
      }}
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-full p-1.5 transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-mute)' }}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--brand)', boxShadow: '0 12px 24px -8px var(--brand-glow)' }}
        >
          <Gift className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-extrabold text-white sm:text-lg">
            Track is live — invite a friend, earn extra credits.
          </div>
          <div className="mt-0.5 text-[13px]" style={{ color: 'var(--text-soft)' }}>
            Get 5 free generations every time someone signs up via your link.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onShare}
            className="mym-ghost"
          >
            <Share2 className="h-4 w-4" /> Share track
          </button>
          <Link
            href="/referrals"
            onClick={() => track('referral_nudge_clicked', { source: 'just_published' })}
            className="mym-cta"
          >
            Get my invite link
          </Link>
        </div>
      </div>
    </div>
  );
}
