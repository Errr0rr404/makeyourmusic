'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { TrackRow } from '@/components/track/TrackRow';
import { Bot, Users, Play, Heart, Music, AlertCircle, Radio } from 'lucide-react';
import { formatCount } from '@morlo/shared';
import { toast } from '@/lib/store/toastStore';

export function AgentDetailClient({ slug }: { slug: string }) {
  const [agent, setAgent] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const { playTrack, startRadio } = usePlayerStore();

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        // Fetch agent by slug
        const agentRes = await api.get(`/agents/${slug}`);
        const fetchedAgent = agentRes.data.agent;
        setAgent(fetchedAgent);

        // Fetch tracks using the agent's actual ID
        if (fetchedAgent?.id) {
          const tracksRes = await api.get(`/tracks?agentId=${fetchedAgent.id}&limit=50`);
          setTracks(tracksRes.data.tracks || []);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load agent');
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleFollow = async () => {
    if (!agent || !isAuthenticated) {
      if (!isAuthenticated) toast.warning('Log in to follow artists');
      return;
    }
    try {
      const res = await api.post(`/social/follows/${agent.id}`);
      setAgent({
        ...agent,
        isFollowing: res.data.following,
        followerCount: agent.followerCount + (res.data.following ? 1 : -1),
      });
      toast.success(res.data.following ? `Following ${agent.name}` : `Unfollowed ${agent.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to follow agent');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-48 bg-[hsl(var(--secondary))] rounded-2xl animate-pulse mb-6" />
        <div className="h-8 w-48 bg-[hsl(var(--secondary))] rounded animate-pulse" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <p className="text-[hsl(var(--muted-foreground))] mb-4">{error || 'Agent not found'}</p>
        <Link href="/" className="text-[hsl(var(--accent))] hover:underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Agent Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        {/* Cover */}
        <div className="h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/30">
          {agent.coverImage && (
            <img src={agent.coverImage} alt={`${agent.name} cover`} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex items-end gap-5">
          <div className="w-28 h-28 rounded-full border-4 border-[hsl(var(--background))] overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
            {agent.avatar ? (
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <Bot className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-[hsl(var(--accent))]" />
              <span className="text-xs font-medium text-[hsl(var(--accent))]">AI Agent</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {formatCount(agent.followerCount)} followers</span>
              <span className="flex items-center gap-1"><Music className="w-4 h-4" /> {agent._count?.tracks || 0} tracks</span>
              <span className="flex items-center gap-1"><Play className="w-4 h-4" /> {formatCount(agent.totalPlays)} plays</span>
            </div>
          </div>
          {isAuthenticated && (
            <button onClick={handleFollow}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors flex-shrink-0 ${agent.isFollowing
                ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                : 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90'}`}>
              {agent.isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {agent.bio && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-2xl">{agent.bio}</p>
      )}

      {/* Genres */}
      {agent.genres?.length > 0 && (
        <div className="flex gap-2 mb-6">
          {agent.genres.map((ag: any) => (
            <span key={ag.genre.id} className="px-3 py-1 rounded-full bg-[hsl(var(--secondary))] text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {ag.genre.name}
            </span>
          ))}
        </div>
      )}

      {/* Play / Radio actions */}
      {tracks.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => playTrack(tracks[0], tracks)}
            className="flex items-center gap-2 h-11 px-5 rounded-full bg-[hsl(var(--accent))] text-white font-semibold hover:scale-[1.03] transition-transform"
          >
            <Play className="w-5 h-5 fill-current" /> Play
          </button>
          <button
            onClick={() => { void startRadio(tracks[0]); toast.success(`AI Radio from ${agent.name}`); }}
            className="flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-[1.03] transition-transform"
          >
            <Radio className="w-4 h-4" /> AI Radio
          </button>
        </div>
      )}

      {/* Tracks */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Tracks</h2>
        {tracks.length > 0 ? (
          <div className="space-y-1">
            {tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} tracks={tracks} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No tracks yet</p>
        )}
      </div>
    </div>
  );
}
