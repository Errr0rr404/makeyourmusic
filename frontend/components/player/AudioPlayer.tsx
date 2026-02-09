'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/playerStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ListMusic,
} from 'lucide-react';
import api from '@/lib/api';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRecordedRef = useRef(false);

  const {
    currentTrack, isPlaying, volume, progress, duration,
    shuffle, repeat, togglePlay, nextTrack, prevTrack,
    setVolume, setProgress, setDuration, toggleShuffle, toggleRepeat,
  } = usePlayerStore();

  // Sync audio element with state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.audioUrl;
    audio.volume = volume;
    playRecordedRef.current = false;

    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);

    // Record play after 30 seconds
    if (audio.currentTime > 30 && !playRecordedRef.current && currentTrack) {
      playRecordedRef.current = true;
      api.post(`/tracks/${currentTrack.id}/play`, {
        durationPlayed: Math.floor(audio.currentTime),
        completed: false,
      }).catch(() => {});
    }
  }, [currentTrack, setProgress]);

  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } else {
      // Record completed play
      if (currentTrack) {
        api.post(`/tracks/${currentTrack.id}/play`, {
          durationPlayed: Math.floor(duration),
          completed: true,
        }).catch(() => {});
      }
      nextTrack();
    }
  }, [repeat, nextTrack, currentTrack, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  };

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[var(--player-height)] bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] z-50 flex items-center px-4">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={handleEnded}
      />

      {/* Track Info */}
      <div className="flex items-center gap-3 w-[240px] min-w-[180px]">
        <div className="w-12 h-12 rounded-md overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
          {currentTrack.coverArt ? (
            <img src={currentTrack.coverArt} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ListMusic className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <Link href={`/track/${currentTrack.slug}`} className="text-sm font-medium text-white truncate block hover:underline">
            {currentTrack.title}
          </Link>
          <Link href={`/agent/${currentTrack.agent.slug}`} className="text-xs text-[hsl(var(--muted-foreground))] truncate block hover:underline">
            {currentTrack.agent.name}
          </Link>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center max-w-[600px] mx-auto">
        <div className="flex items-center gap-4 mb-1">
          <button onClick={toggleShuffle} className={`p-1 transition-colors ${shuffle ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={prevTrack} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
          <button onClick={toggleRepeat} className={`p-1 transition-colors ${repeat !== 'none' ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'}`}>
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-10 text-right">{formatTime(progress)}</span>
          <div className="flex-1 relative group">
            <div className="h-1 rounded-full bg-[hsl(var(--secondary))]">
              <div className="h-full rounded-full bg-white group-hover:bg-[hsl(var(--accent))] transition-colors" style={{ width: `${progressPercent}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))] w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-[160px] justify-end">
        <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="w-24 relative group">
          <div className="h-1 rounded-full bg-[hsl(var(--secondary))]">
            <div className="h-full rounded-full bg-white group-hover:bg-[hsl(var(--accent))] transition-colors" style={{ width: `${volume * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
