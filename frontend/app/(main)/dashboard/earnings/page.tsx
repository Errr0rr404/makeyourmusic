'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ArrowLeft, TrendingUp, DollarSign, Play, Lock, AlertCircle,
  Loader2, Calendar, Bot,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
  totalPlays: number;
  followerCount: number;
}

interface EarningRecord {
  id: string;
  period: string; // "YYYY-MM"
  amount: number;
  plays: number;
  createdAt: string;
}

export default function EarningsPage() {
  const { isAuthenticated } = useAuthStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    api
      .get('/agents/mine')
      .then((r) => {
        const a: Agent[] = r.data.agents || [];
        setAgents(a);
        if (a.length > 0) setSelectedAgentId(a[0]!.id);
      })
      .catch((err) =>
        setError(err.response?.data?.error || 'Failed to load your agents')
      )
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const loadEarnings = useCallback(async (agentId: string) => {
    setLoadingEarnings(true);
    try {
      const res = await api.get(`/subscription/earnings/${agentId}`);
      setEarnings(res.data.earnings || []);
      setTotalEarnings(res.data.totalEarnings || 0);
    } catch {
      setEarnings([]);
      setTotalEarnings(0);
    } finally {
      setLoadingEarnings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgentId) loadEarnings(selectedAgentId);
  }, [selectedAgentId, loadEarnings]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Creator earnings</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to view your earnings</p>
          <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Derive simple stats from earnings
  const totalPlays = earnings.reduce((s, e) => s + e.plays, 0);
  const avgPerMonth =
    earnings.length > 0 ? totalEarnings / earnings.length : 0;
  const maxAmount = Math.max(...earnings.map((e) => e.amount), 1);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-4 py-6 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-[hsl(var(--accent))]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Earnings</h1>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Your revenue from streams and subscriptions, broken down by agent and month.
        </p>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[hsl(var(--muted-foreground))] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
            <Bot className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">No agents yet</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Create an AI agent to start earning from streams.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white text-sm font-semibold"
            >
              Create an agent
            </Link>
          </div>
        ) : (
          <>
            {/* Agent picker */}
            <div className="flex gap-2 flex-wrap mb-6">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(a.id)}
                  className={`flex items-center gap-2 max-w-full px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedAgentId === a.id
                      ? 'bg-[hsl(var(--accent))] text-white'
                      : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-white border border-[hsl(var(--border))]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-green-400" />}
                label="Total earnings"
                value={`$${totalEarnings.toFixed(2)}`}
                sub={`from ${earnings.length} period${earnings.length === 1 ? '' : 's'}`}
              />
              <StatCard
                icon={<Play className="w-5 h-5 text-blue-400" />}
                label="Total plays (paid)"
                value={totalPlays.toLocaleString()}
                sub={selectedAgent ? `all-time: ${selectedAgent.totalPlays.toLocaleString()}` : ''}
              />
              <StatCard
                icon={<Calendar className="w-5 h-5 text-purple-400" />}
                label="Average / month"
                value={`$${avgPerMonth.toFixed(2)}`}
                sub={earnings.length > 0 ? '' : 'no data yet'}
              />
            </div>

            {/* Monthly breakdown */}
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Monthly breakdown</h2>
                {loadingEarnings && <Loader2 className="w-4 h-4 text-[hsl(var(--muted-foreground))] animate-spin" />}
              </div>
              {earnings.length === 0 ? (
                <div className="py-12 text-center">
                  <DollarSign className="w-10 h-10 text-[hsl(var(--muted-foreground))] opacity-40 mx-auto mb-3" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No earnings recorded yet. Earnings accumulate as your tracks get plays from premium subscribers.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {earnings.map((e) => (
                    <div key={e.id} className="px-4 py-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center justify-between gap-3 sm:block sm:w-16">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                          {e.period}
                        </span>
                        <span className="text-sm font-bold text-white sm:hidden">${e.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Simple bar chart */}
                        <div className="h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                            style={{ width: `${(e.amount / maxAmount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-bold text-white">${e.amount.toFixed(2)}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {e.plays.toLocaleString()} plays
                        </p>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] sm:hidden">
                        {e.plays.toLocaleString()} plays
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
              Earnings are calculated monthly from premium subscription revenue proportional to stream share. Details in{' '}
              <Link href="/terms" className="text-[hsl(var(--accent))] hover:underline">Terms</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sub}</p>}
    </div>
  );
}
