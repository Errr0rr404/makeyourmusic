'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Loader2, AlertCircle, Bot, Music2, Play, Users } from 'lucide-react';

// Minimal public-profile route. The clip detail page (and a few others) link
// to /profile/<username>, which previously 404'd. This page resolves the
// username via the existing user-lookup API: when it's the current user we
// redirect to the canonical /profile, otherwise we render a thin profile
// surface that lists the user's public agents and tracks.
export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    user: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
      bio: string | null;
      createdAt?: string;
    } | null;
    agents: Array<{
      id: string;
      name: string;
      slug: string;
      avatar: string | null;
      bio?: string | null;
      followerCount?: number;
      _count?: { tracks?: number };
    }>;
    tracks: Array<{
      id: string;
      title: string;
      slug: string;
      coverArt: string | null;
      duration?: number;
      playCount?: number;
      likeCount?: number;
      agent?: { id: string; name: string; slug: string; avatar: string | null };
    }>;
  } | null>(null);

  useEffect(() => {
    if (me?.username === username) {
      router.replace('/profile');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Falls through gracefully if the endpoint isn't deployed yet.
        const res = await api.get(`/users/${encodeURIComponent(username)}`);
        if (!cancelled) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              'Profile not found',
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, me?.username, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }
  if (error || !data?.user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
        <h1 className="text-lg font-semibold text-white mb-1">Profile unavailable</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{error || 'This profile cannot be shown.'}</p>
      </div>
    );
  }
  const u = data.user;
  const totalFollowers = data.agents.reduce((sum, agent) => sum + (agent.followerCount || 0), 0);
  const totalPlays = data.tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);
  const joinedLabel = u.createdAt ? new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null;
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="relative overflow-hidden rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--bg-elev-2)] p-5 sm:p-6 mb-8">
        <div className="absolute inset-0 opacity-70" style={{ background: 'var(--hero-gradient)' }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="w-24 h-24 rounded-2xl bg-[hsl(var(--secondary))] flex items-center justify-center overflow-hidden border border-white/10 shadow-xl shadow-black/25">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-2xl font-bold text-white">{(u.displayName || u.username).slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate">{u.displayName || u.username}</h1>
            <p className="text-sm text-white/70">@{u.username}{joinedLabel ? ` · joined ${joinedLabel}` : ''}</p>
            {u.bio ? <p className="text-sm text-white/80 mt-2 max-w-2xl">{u.bio}</p> : null}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                <div className="text-base font-bold text-white">{data.agents.length}</div>
                <div className="text-[11px] text-white/60">Agents</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                <div className="text-base font-bold text-white">{data.tracks.length}</div>
                <div className="text-[11px] text-white/60">Tracks</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                <div className="text-base font-bold text-white">{totalFollowers}</div>
                <div className="text-[11px] text-white/60">Followers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-purple-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Agents
          </h2>
        </div>
        {data.agents.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No public agents yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.slug}`}
                className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 hover:border-purple-400/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0">
                  {agent.avatar ? (
                    <img src={agent.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Bot className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="inline-flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      {agent._count?.tracks || 0} tracks
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {agent.followerCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Music2 className="w-4 h-4 text-purple-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Tracks
          </h2>
        </div>
        {data.tracks.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No public tracks yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.tracks.map((track) => (
              <Link
                key={track.id}
                href={`/track/${track.slug}`}
                className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 hover:border-purple-400/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0">
                  {track.coverArt ? (
                    <img src={track.coverArt} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Music2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{track.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="truncate">{track.agent?.name || 'Track'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {track.playCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      {totalPlays > 0 && (
        <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          Public tracks on this profile have {totalPlays} plays.
        </p>
      )}
    </div>
  );
}
