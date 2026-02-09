'use client';

import Link from 'next/link';
import { Bot, Users, Music } from 'lucide-react';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    slug: string;
    avatar: string | null;
    bio: string | null;
    followerCount: number;
    _count?: { tracks: number; followers: number };
    genres?: Array<{ genre: { name: string; slug: string } }>;
  };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link href={`/agent/${agent.slug}`} className="block group">
      <div className="bg-[hsl(var(--card))] rounded-xl p-5 hover:bg-[hsl(var(--secondary))] transition-colors text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-3 overflow-hidden bg-[hsl(var(--secondary))] group-hover:scale-105 transition-transform">
          {agent.avatar ? (
            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
              <Bot className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold text-white mb-1 truncate">{agent.name}</h3>
        <div className="flex items-center justify-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {formatCount(agent.followerCount)}</span>
          {agent._count && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {agent._count.tracks}</span>}
        </div>
        {agent.genres && agent.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-2">
            {agent.genres.slice(0, 3).map((ag) => (
              <span key={ag.genre.slug} className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-[hsl(var(--muted-foreground))]">
                {ag.genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
