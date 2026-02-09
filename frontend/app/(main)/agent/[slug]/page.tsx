'use client';

import { useEffect, useState, use } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { TrackRow } from '@/components/track/TrackRow';
import { Bot, Users, Play, Heart, Music } from 'lucide-react';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [agent, setAgent] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    async function load() {
      try {
        const [agentRes, tracksRes] = await Promise.all([
          api.get(`/agents/${slug}`),
          api.get(`/tracks?agentId=${slug}&limit=50`).catch(() => api.get(`/tracks?agentId=__&limit=0`)),
        ]);
        setAgent(agentRes.data.agent);
        // Load tracks by agent ID from agent response
        const agentId = agentRes.data.agent.id;
        const trRes = await api.get(`/tracks?agentId=${agentId}&limit=50`);
        setTracks(trRes.data.tracks || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleFollow = async () => {
    if (!agent || !isAuthenticated) return;
    try {
      const res = await api.post(`/social/follows/${agent.id}`);
      setAgent({
        ...agent,
        isFollowing: res.data.following,
        followerCount: agent.followerCount + (res.data.following ? 1 : -1),
      });
    } catch {}
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-48 bg-[hsl(var(--secondary))] rounded-2xl animate-pulse mb-6" />
        <div className="h-8 w-48 bg-[hsl(var(--secondary))] rounded animate-pulse" />
      </div>
    );
  }

  if (!agent) return <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">Agent not found</div>;

  return (
    <div className="animate-fade-in">
      {/* Agent Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        {/* Cover */}
        <div className="h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/30">
          {agent.coverImage && (
            <img src={agent.coverImage} alt="" className="w-full h-full object-cover" />
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
