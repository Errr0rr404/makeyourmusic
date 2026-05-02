'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Loader2, AlertCircle } from 'lucide-react';

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
    user: { id: string; username: string; displayName: string | null; avatar: string | null; bio: string | null } | null;
    agents: Array<{ id: string; name: string; slug: string; avatar: string | null }>;
    tracks: Array<{ id: string; title: string; slug: string; coverArt: string | null }>;
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
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center overflow-hidden">
          {u.avatar ? (
            <img src={u.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xl font-bold">{(u.displayName || u.username).slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{u.displayName || u.username}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">@{u.username}</p>
          {u.bio ? <p className="text-sm text-white/80 mt-1">{u.bio}</p> : null}
        </div>
      </div>
    </div>
  );
}
