'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { validatePaymentRedirect } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import { Check, Crown, Sparkles, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Cassette } from '@/components/vintage';

type Tier = 'FREE' | 'CREATOR' | 'PREMIUM';

interface PlanCard {
  tier: Tier;
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  icon: React.ReactNode;
  /** Vintage cassette grade — appears on the J-card stripe + label */
  grade: 'ferric' | 'chrome' | 'metal';
  position: string;
}

const PLANS: PlanCard[] = [
  {
    tier: 'FREE',
    name: 'Free',
    price: '$0',
    blurb: 'Try the platform, no card required.',
    features: [
      '5 generations per day',
      'Public tracks & playlists',
      'Listen to everything',
    ],
    cta: 'Current plan',
    icon: <Sparkles className="w-5 h-5" />,
    grade: 'ferric',
    position: 'Type I — NORMAL',
  },
  {
    tier: 'CREATOR',
    name: 'Creator',
    price: '$3.99',
    blurb: 'Make more, earn from your fans.',
    features: [
      '50 generations per day',
      'Accept tips on your profile',
      'Sell access to private playlists',
      'Stripe payouts to your bank',
      'Keep 85% of every sale',
    ],
    cta: 'Become a Creator',
    highlight: true,
    icon: <Zap className="w-5 h-5" />,
    grade: 'chrome',
    position: 'Type II — CrO₂',
  },
  {
    tier: 'PREMIUM',
    name: 'Premium',
    price: 'Custom',
    blurb: 'For power users who need more.',
    features: [
      '100 generations per day',
      'All Creator features',
      'Priority generation queue',
    ],
    cta: 'Go Premium',
    icon: <Crown className="w-5 h-5" />,
    grade: 'metal',
    position: 'Type IV — METAL',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [currentTier, setCurrentTier] = useState<Tier>('FREE');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<Tier | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get('/subscription')
      .then((res) => {
        const sub = res.data?.subscription;
        if (sub?.status === 'ACTIVE') setCurrentTier(sub.tier);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleUpgrade = async (tier: Tier) => {
    if (!isAuthenticated) { router.push('/login?next=/pricing'); return; }
    if (tier === 'FREE' || tier === currentTier) return;
    setCheckingOut(tier);
    try {
      const res = await api.post('/subscription/checkout', { tier });
      const safe = validatePaymentRedirect(res.data?.url);
      if (safe) {
        window.location.href = safe;
      } else {
        toast.error('Could not start checkout');
      }
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Checkout failed');
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl mym-section-title mb-3 inline-block">
          Pricing
        </h1>
        <p className="text-[color:var(--text-mute)] max-w-2xl mx-auto">
          Generate more music — and start earning when fans love what you make.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isBusy = checkingOut === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl p-5 sm:p-6 border transition-colors ${
                plan.highlight
                  ? 'bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-purple-400/40 modern-only'
                  : 'bg-[color:var(--card)] border-[color:var(--stroke)] modern-only'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500 text-white">
                  Most Popular
                </div>
              )}
              <PlanBody
                plan={plan}
                isCurrent={isCurrent}
                isBusy={isBusy}
                loading={loading}
                onUpgrade={handleUpgrade}
                modernCta={plan.highlight ? 'bg-white text-black hover:scale-[1.02]' : 'bg-[color:var(--secondary)] text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)]'}
              />
            </div>
          );
        })}

        {/* Vintage variant — full cassette J-card */}
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isBusy = checkingOut === plan.tier;
          return (
            <div
              key={`vintage-${plan.tier}`}
              className="vintage-only relative p-5 sm:p-6"
              style={{
                background: 'var(--bg-paper)',
                color: 'var(--text)',
                border: '1px solid var(--stroke-strong)',
                borderRadius: 4,
                boxShadow:
                  plan.highlight
                    ? '0 0 0 2px var(--brand), 0 6px 14px rgba(0, 0, 0, 0.30)'
                    : '0 4px 10px rgba(0, 0, 0, 0.30)',
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1"
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    fontSize: 11,
                  }}
                >
                  Most Popular
                </div>
              )}

              {/* Cassette illustration — top of card */}
              <div className="flex justify-center mb-4 mt-2">
                <Cassette
                  width={220}
                  grade={plan.grade}
                  title={plan.name}
                  artist={plan.position}
                  side="A"
                  spinning={false}
                />
              </div>

              <PlanBody
                plan={plan}
                isCurrent={isCurrent}
                isBusy={isBusy}
                loading={loading}
                onUpgrade={handleUpgrade}
                vintage
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-[color:var(--text-mute)] mt-8">
        Platform takes 15% on tips and channel subscriptions to cover Stripe fees &amp; hosting.
        Payouts run on Stripe Express — your money lands in your bank.
      </p>
    </div>
  );
}

function PlanBody({
  plan,
  isCurrent,
  isBusy,
  loading,
  onUpgrade,
  modernCta,
  vintage,
}: {
  plan: PlanCard;
  isCurrent: boolean;
  isBusy: boolean;
  loading: boolean;
  onUpgrade: (tier: Tier) => void;
  modernCta?: string;
  vintage?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--text)' }}>
        {plan.icon}
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {vintage && (
          <span
            className="ml-auto px-1.5 py-0.5"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 11,
              color: 'var(--text-mute)',
              border: '1px solid var(--stroke-strong)',
            }}
          >
            {plan.position}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
        {plan.price}
        {plan.tier !== 'FREE' && plan.price !== 'Custom' && (
          <span className="text-sm font-normal text-[color:var(--text-mute)]"> /mo</span>
        )}
      </div>
      <p className="text-sm text-[color:var(--text-mute)] mb-5">{plan.blurb}</p>
      <ul className="space-y-2 mb-6 min-h-[160px]">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-soft)' }}>
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onUpgrade(plan.tier)}
        disabled={loading || isCurrent || plan.tier === 'FREE' || isBusy}
        className={
          vintage
            ? 'mym-cta w-full justify-center'
            : `w-full py-2.5 rounded-full text-sm font-medium transition-all ${
                isCurrent
                  ? 'bg-[color:var(--bg-elev-2)] text-[color:var(--text-mute)] cursor-default'
                  : modernCta
              } disabled:opacity-50`
        }
      >
        {isBusy ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
          </span>
        ) : isCurrent ? (
          'Current plan'
        ) : (
          plan.cta
        )}
      </button>
    </>
  );
}
