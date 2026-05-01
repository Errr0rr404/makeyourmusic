'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Users, DollarSign } from 'lucide-react';

interface Stats {
  refereeCount: number;
  lifetimeEarningsCents: number;
  paidOutCents: number;
  pendingCents: number;
  bps: number;
  windowDays: number;
}

// Referral dashboard: each user gets a unique short code. Share with the
// link below; new signups crediting that code earn their referrer 10% of
// any creator earnings (tips + subs + sync licenses) for 12 months.
export default function ReferralsPage() {
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: cdata }, { data: sdata }] = await Promise.all([
          api.get<{ code: string; username: string }>('/referrals/code'),
          api.get<Stats>('/referrals/stats'),
        ]);
        if (cancelled) return;
        setCode(cdata.code);
        setUsername(cdata.username);
        setStats(sdata);
      } catch (err) {
        toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load referrals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const link =
    typeof window !== 'undefined' && code
      ? `${window.location.origin}/register?ref=${code}`
      : '';

  if (loading) {
    return <div className="p-8 text-sm text-[hsl(var(--muted-foreground))]">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Refer creators, earn forever*</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
          *Earn {(stats?.bps ?? 1000) / 100}% of every creator&apos;s earnings (tips, paid playlists, sync licenses)
          for {Math.round((stats?.windowDays ?? 365) / 30)} months from their signup. Paid out automatically via Stripe.
        </p>
      </header>

      <section className="p-4 rounded-lg bg-[hsl(var(--bg-elev-1))] border border-[hsl(var(--border))]">
        <h2 className="text-sm font-medium mb-2">Your referral link</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 px-3 py-2 rounded-md bg-black/30 border border-[hsl(var(--border))] font-mono text-sm"
          />
          <button
            type="button"
            onClick={async () => {
              if (link) {
                await navigator.clipboard.writeText(link);
                toast.success('Copied');
              }
            }}
            className="px-3 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] inline-flex items-center gap-1"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
          Code: <code className="font-mono">{code}</code> · username: <code className="font-mono">@{username}</code>
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Creators referred" value={String(stats?.refereeCount ?? 0)} icon={<Users className="w-4 h-4" />} />
        <Stat label="Lifetime earned" value={formatCents(stats?.lifetimeEarningsCents ?? 0)} icon={<DollarSign className="w-4 h-4" />} />
        <Stat label="Paid out" value={formatCents(stats?.paidOutCents ?? 0)} />
        <Stat label="Pending" value={formatCents(stats?.pendingCents ?? 0)} />
      </section>

      <section className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
        <p>How it works:</p>
        <ul className="list-disc list-inside">
          <li>Share your link. New users sign up via <code>?ref=</code>.</li>
          <li>When they earn money on the platform, you get a cut.</li>
          <li>We pay out automatically to your Stripe Connect account, batched weekly.</li>
        </ul>
      </section>
    </div>
  );
}

function formatCents(c: number) {
  return `$${(c / 100).toFixed(2)}`;
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-md bg-[hsl(var(--bg-elev-1))] border border-[hsl(var(--border))]">
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1 inline-flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
