'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Video, Radio } from 'lucide-react';
import { usePlayerStore, TrackItem } from '@/lib/store/playerStore';

interface TrackCardProps {
  track: TrackItem & {
    playCount?: number;
    likeCount?: number;
    isLiked?: boolean;
    video?: { id: string } | null;
  };
  tracks?: TrackItem[];
  showAgent?: boolean;
}

export function TrackCard({ track, tracks, showAgent = true }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, startRadio } = usePlayerStore();
  const isCurrentTrack = currentTrack?.id === track.id;
  const [imgError, setImgError] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track, tracks);
    }
  };

  const handleRadio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void startRadio(track);
  };

  return (
    <div className="group relative bg-[hsl(var(--card))] rounded-xl p-3 hover:bg-[hsl(var(--secondary))] transition-colors cursor-pointer">
      <Link href={`/track/${track.slug}`} className="block">
        {/* Cover Art */}
        <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[hsl(var(--secondary))]">
          {track.coverArt && !imgError ? (
            <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
              <Play className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}

          {/* Video Badge */}
          {track.video && (
            <div className="absolute top-2 right-2 bg-black/70 rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <Video className="w-3 h-3 text-white" />
              <span className="text-[10px] text-white font-medium">Video</span>
            </div>
          )}

          {/* Hover actions: Radio (left) + Play (right) */}
          <button
            onClick={handleRadio}
            aria-label={`Start radio from ${track.title}`}
            title="Start AI Radio from this track"
            className="absolute bottom-2 right-14 w-10 h-10 rounded-full bg-black/70 backdrop-blur shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105 hover:bg-black/85"
          >
            <Radio className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handlePlay}
            aria-label={isCurrentTrack && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[hsl(var(--accent))] shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Track Info */}
        <h3 className="text-sm font-semibold text-white truncate mb-1">
          {track.title}
        </h3>
        {showAgent && track.agent && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {track.agent.name}
          </p>
        )}
      </Link>
    </div>
  );
}
