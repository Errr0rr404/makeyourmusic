'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Code, Plus, Loader2, ShoppingBag, ArrowRight, Layers } from 'lucide-react';

interface PublicApp {
  slug: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  homepage?: string | null;
  scopes: string[];
}

interface MyApp {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  scopes: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  listed: boolean;
  createdAt: string;
}

export default function DeveloperAppsPage() {
  const params = useSearchParams();
  const initialMine = params.get('mine') === '1';
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<'public' | 'mine'>(initialMine ? 'mine' : 'public');
  const [publicApps, setPublicApps] = useState<PublicApp[]>([]);
  const [myApps, setMyApps] = useState<MyApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (tab === 'public') {
          const r = await api.get('/developers/apps');
          if (!cancelled) setPublicApps(r.data?.apps || []);
        } else {
          if (!isAuthenticated) {
            setMyApps([]);
            return;
          }
          const r = await api.get('/developers/apps/mine');
          if (!cancelled) setMyApps(r.data?.apps || []);
        }
      } catch {
        if (!cancelled) {
          if (tab === 'public') setPublicApps([]);
          else setMyApps([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, isAuthenticated]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        href="/developers"
        className="text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-2 inline-block"
      >
        ← Developers
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-purple-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">OAuth apps</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Integrations</h1>
        </div>
        <Link
          href="/developers/apps/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Register an app
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('public')}
          className={`h-9 px-4 rounded-full text-sm font-medium border ${
            tab === 'public'
              ? 'bg-purple-500 border-purple-500 text-white'
              : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Marketplace
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`h-9 px-4 rounded-full text-sm font-medium border ${
            tab === 'mine'
              ? 'bg-purple-500 border-purple-500 text-white'
              : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white'
          }`}
        >
          <Code className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          My apps
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
        </div>
      ) : tab === 'public' ? (
        publicApps.length === 0 ? (
          <p className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">
            No public apps yet. Register the first one!
          </p>
        ) : (
          <ul className="space-y-3">
            {publicApps.map((app) => (
              <li
                key={app.slug}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {app.iconUrl ? <img src={app.iconUrl} alt={app.name} className="w-full h-full object-cover" /> : <Code className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{app.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {app.description || 'No description'}
                  </p>
                  {app.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {app.scopes.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] font-mono text-[hsl(var(--muted-foreground))]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {app.homepage && (
                  <a
                    href={app.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-300 hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    Visit <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )
      ) : !isAuthenticated ? (
        <p className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">
          <Link href="/login" className="text-purple-300 hover:underline">Log in</Link> to manage your apps.
        </p>
      ) : myApps.length === 0 ? (
        <p className="text-center py-10 text-sm text-[hsl(var(--muted-foreground))]">
          You haven't registered any OAuth apps yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {myApps.map((app) => (
            <li key={app.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{app.name}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-200'
                      : app.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-200'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {app.status}
                  </span>
                  {app.listed && app.status === 'APPROVED' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-500/20 text-purple-200">
                      LISTED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate">{app.clientId}</p>
              </div>
              <Link
                href={`/developers/apps/${app.id}`}
                className="text-xs text-purple-300 hover:underline flex-shrink-0"
              >
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
