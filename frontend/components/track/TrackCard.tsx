'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, Video, Radio, Music2 } from 'lucide-react';
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
  const isCurrentlyPlaying = isCurrentTrack && isPlaying;
  const [imgError, setImgError] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentTrack) togglePlay();
    else playTrack(track, tracks);
  };

  const handleRadio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void startRadio(track);
  };

  return (
    <Link
      href={`/track/${track.slug}`}
      className="group relative block p-3 rounded-xl bg-[color:var(--bg-elev-2)] hover:bg-[color:var(--bg-elev-3)] transition-colors"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-[color:var(--bg-elev-3)] shadow-lg shadow-black/30">
        {track.coverArt && !imgError ? (
          <img
            src={track.coverArt}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(217,70,239,0.25))' }}
          >
            <Music2 className="w-10 h-10 text-white/50" />
          </div>
        )}

        {/* Currently-playing badge: tiny equalizer + label */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur">
            <span className="flex gap-0.5 items-end h-3">
              <span className="eq-bar" />
              <span className="eq-bar" />
              <span className="eq-bar" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Playing</span>
          </div>
        )}

        {track.video && !isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur">
            <Video className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-semibold">Video</span>
          </div>
        )}

        {/* Hover actions: Radio (smaller) + Play (signature) */}
        <button
          onClick={handleRadio}
          aria-label={`Start radio from ${track.title}`}
          title="Start AI Radio"
          className="absolute bottom-3 right-[68px] w-10 h-10 rounded-full bg-black/65 backdrop-blur text-white shadow-lg flex items-center justify-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-black/80"
        >
          <Radio className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlay}
          aria-label={isCurrentlyPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="absolute bottom-3 right-3 mym-play-fab opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
        >
          {isCurrentlyPlaying ? (
            <Pause className="w-5 h-5" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      <h3
        className={`text-sm font-semibold truncate mb-1 transition-colors ${
          isCurrentTrack ? 'text-[color:var(--brand)]' : 'text-white'
        }`}
      >
        {track.title}
      </h3>
      {showAgent && track.agent && (
        <p className="text-xs text-[color:var(--text-mute)] truncate">{track.agent.name}</p>
      )}
    </Link>
  );
}
