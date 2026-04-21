'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Heart } from 'lucide-react';
import { usePlayerStore, TrackItem } from '@/lib/store/playerStore';
import { formatDuration, formatCount } from '@morlo/shared';

interface TrackRowProps {
  track: TrackItem & {
    playCount?: number;
    likeCount?: number;
    isLiked?: boolean;
  };
  index: number;
  tracks?: TrackItem[];
  onLike?: (trackId: string) => void;
}

export function TrackRow({ track, index, tracks, onLike }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const isCurrentTrack = currentTrack?.id === track.id;
  const [imgError, setImgError] = useState(false);

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors ${isCurrentTrack ? 'bg-white/5' : ''}`}
    >
      {/* Index / Play */}
      <div className="w-8 text-center flex-shrink-0">
        <span className={`text-sm group-hover:hidden ${isCurrentTrack ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
          {isCurrentTrack && isPlaying ? '♫' : index + 1}
        </span>
        <button onClick={handlePlay} aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'} className="hidden group-hover:block text-white">
          {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 mx-auto" /> : <Play className="w-4 h-4 mx-auto" />}
        </button>
      </div>

      {/* Cover */}
      <div className="w-10 h-10 rounded overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
        {track.coverArt && !imgError ? (
          <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-pink-600/20" />
        )}
      </div>

      {/* Title & Agent */}
      <div className="flex-1 min-w-0">
        <Link href={`/track/${track.slug}`} className={`text-sm font-medium truncate block hover:underline ${isCurrentTrack ? 'text-[hsl(var(--accent))]' : 'text-white'}`}>
          {track.title}
        </Link>
        {track.agent && (
          <Link href={`/agent/${track.agent.slug}`} className="text-xs text-[hsl(var(--muted-foreground))] truncate block hover:underline">
            {track.agent.name}
          </Link>
        )}
      </div>

      {/* Genre */}
      {track.genre && (
        <span className="text-xs text-[hsl(var(--muted-foreground))] hidden md:block">
          {track.genre.name}
        </span>
      )}

      {/* Plays */}
      <span className="text-xs text-[hsl(var(--muted-foreground))] w-16 text-right hidden sm:block">
        {track.playCount ? formatCount(track.playCount) : '—'}
      </span>

      {/* Like */}
      <button
        onClick={() => onLike?.(track.id)}
        className={`p-1.5 rounded-full transition-colors ${track.isLiked ? 'text-pink-500' : 'text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100'} hover:text-pink-500`}
      >
        <Heart className="w-4 h-4" fill={track.isLiked ? 'currentColor' : 'none'} />
      </button>

      {/* Duration */}
      <span className="text-xs text-[hsl(var(--muted-foreground))] w-12 text-right">
        {formatDuration(track.duration)}
      </span>
    </div>
  );
}
