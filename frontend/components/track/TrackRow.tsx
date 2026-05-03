'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Heart, X, Music2 } from 'lucide-react';
import { usePlayerStore, TrackItem } from '@/lib/store/playerStore';
import { formatDuration, formatCount } from '@makeyourmusic/shared';

interface TrackRowProps {
  track: TrackItem & {
    playCount?: number;
    likeCount?: number;
    isLiked?: boolean;
  };
  index: number;
  tracks?: TrackItem[];
  onLike?: (trackId: string) => void;
  onRemove?: (trackId: string) => void;
}

export function TrackRow({ track, index, tracks, onLike, onRemove }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const isCurrentTrack = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  const [imgError, setImgError] = useState(false);

  const handlePlay = () => {
    if (isCurrentTrack) togglePlay();
    else playTrack(track, tracks);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePlay}
      onKeyDown={handleRowKeyDown}
      aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}${track.agent ? ` by ${track.agent.name}` : ''}`}
      className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] ${
        isCurrentTrack ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
      }`}
    >
      {/* Index / Play / Equalizer */}
      <div className="w-7 text-center flex-shrink-0">
        {isCurrentlyPlaying ? (
          <button
            onClick={(e) => { e.stopPropagation(); handlePlay(); }}
            aria-label="Pause"
            className="inline-flex items-end gap-0.5 h-3"
          >
            <span className="eq-bar" />
            <span className="eq-bar" />
            <span className="eq-bar" />
          </button>
        ) : (
          <>
            <span
              className={`text-sm group-hover:hidden ${
                isCurrentTrack ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-mute)]'
              }`}
            >
              {index + 1}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlay(); }}
              aria-label={`Play ${track.title}`}
              className="hidden group-hover:inline-flex text-white"
            >
              <Play className="w-4 h-4 mx-auto" fill="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* Cover */}
      <div className="w-11 h-11 rounded-md overflow-hidden bg-[color:var(--bg-elev-3)] flex items-center justify-center flex-shrink-0">
        {track.coverArt && !imgError ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music2 className="w-4 h-4 text-[color:var(--text-mute)]" />
        )}
      </div>

      {/* Title & Agent */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/track/${track.slug}`}
          onClick={(e) => e.stopPropagation()}
          className={`text-sm font-semibold truncate block hover:underline ${
            isCurrentTrack ? 'text-[color:var(--brand)]' : 'text-white'
          }`}
        >
          {track.title}
        </Link>
        {track.agent && (
          <Link
            href={`/agent/${track.agent.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[color:var(--text-mute)] truncate block hover:underline hover:text-white"
          >
            {track.agent.name}
          </Link>
        )}
      </div>

      {track.genre && (
        <span className="text-xs text-[color:var(--text-mute)] hidden md:block">{track.genre.name}</span>
      )}

      <span className="text-xs text-[color:var(--text-mute)] w-16 text-right hidden sm:block">
        {track.playCount ? formatCount(track.playCount) : '—'}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onLike?.(track.id); }}
        aria-label={track.isLiked ? 'Unlike' : 'Like'}
        className={`p-1.5 rounded-full transition-colors ${
          track.isLiked
            ? 'text-[color:var(--brand)]'
            : 'text-[color:var(--text-mute)] md:opacity-0 md:group-hover:opacity-100 hover:text-[color:var(--brand)]'
        }`}
      >
        <Heart className="w-4 h-4" fill={track.isLiked ? 'currentColor' : 'none'} />
      </button>

      <span className="text-xs text-[color:var(--text-mute)] w-12 text-right">
        {formatDuration(track.duration)}
      </span>

      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(track.id); }}
          aria-label="Remove from playlist"
          className="p-1.5 rounded-full text-[color:var(--text-mute)] md:opacity-0 md:group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
