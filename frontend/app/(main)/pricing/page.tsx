'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Check, Crown, Sparkles, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Could not start checkout');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Pricing
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
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
              className={`relative rounded-2xl p-6 border transition-colors ${
                plan.highlight
                  ? 'bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-purple-400/40'
                  : 'bg-[hsl(var(--card))] border-white/5'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500 text-white">
                  Most Popular
                </div>
              )}
              <div className="flex items-center gap-2 mb-1 text-white">
                {plan.icon}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {plan.price}
                {plan.tier !== 'FREE' && plan.price !== 'Custom' && (
                  <span className="text-sm font-normal text-[hsl(var(--muted-foreground))]"> /mo</span>
                )}
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">{plan.blurb}</p>
              <ul className="space-y-2 mb-6 min-h-[160px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/90">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={loading || isCurrent || plan.tier === 'FREE' || isBusy}
                className={`w-full py-2.5 rounded-full text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-white/5 text-[hsl(var(--muted-foreground))] cursor-default'
                    : plan.highlight
                      ? 'bg-white text-black hover:scale-[1.02]'
                      : 'bg-[hsl(var(--secondary))] text-white hover:bg-white/10'
                } disabled:opacity-50`}
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
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-[hsl(var(--muted-foreground))] mt-8">
        Platform takes 15% on tips and channel subscriptions to cover Stripe fees & hosting.
        Payouts run on Stripe Express — your money lands in your bank.
      </p>
    </div>
  );
}
