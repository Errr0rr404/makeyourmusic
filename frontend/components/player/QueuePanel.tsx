'use client';

import { usePlayerStore } from '@/lib/store/playerStore';
import { X, GripVertical, Play, Pause, Trash2, ListMusic } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDuration } from '@morlo/shared';

export function QueuePanel() {
  const {
    queue, queueIndex, currentTrack, isPlaying,
    showQueue, toggleQueue, playTrack, togglePlay,
    removeFromQueue, clearQueue, moveInQueue,
  } = usePlayerStore();

  if (!showQueue || !currentTrack) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);
  const pastTracks = queue.slice(0, queueIndex);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-0 top-16 bottom-[var(--player-height)] w-full max-w-sm bg-[hsl(var(--card))]/95 backdrop-blur-xl border-l border-[hsl(var(--border))] z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Queue</h2>
        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <button
              onClick={clearQueue}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors px-2 py-1"
            >
              Clear
            </button>
          )}
          <button onClick={toggleQueue} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Queue Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Now Playing */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Now Playing</p>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)]">
            <div className="w-10 h-10 rounded overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
              {currentTrack.coverArt ? (
                <img src={currentTrack.coverArt} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ListMusic className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{currentTrack.agent?.name}</p>
            </div>
            <button onClick={togglePlay} className="p-1 text-[hsl(var(--accent))]">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Up Next */}
        {upcomingTracks.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
              Up Next · {upcomingTracks.length} track{upcomingTracks.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-0.5">
              {upcomingTracks.map((track, relativeIdx) => {
                const absoluteIdx = queueIndex + 1 + relativeIdx;
                return (
                  <div
                    key={`${track.id}-${absoluteIdx}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group transition-colors"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-50 flex-shrink-0 cursor-grab" />
                    <div className="w-8 h-8 rounded overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
                      {track.coverArt ? (
                        <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{track.title}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{track.agent?.name}</p>
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] tabular-nums">{formatDuration(track.duration)}</span>
                    <button
                      onClick={() => playTrack(track, queue)}
                      className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(track.id)}
                      className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Previously Played */}
        {pastTracks.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
              Previously Played
            </p>
            <div className="space-y-0.5 opacity-60">
              {pastTracks.map((track, idx) => (
                <div
                  key={`past-${track.id}-${idx}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group transition-colors"
                >
                  <div className="w-8 h-8 rounded overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0">
                    {track.coverArt ? (
                      <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/70 truncate">{track.title}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{track.agent?.name}</p>
                  </div>
                  <button
                    onClick={() => playTrack(track, queue)}
                    className="p-1 text-[hsl(var(--muted-foreground))] hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {queue.length <= 1 && (
          <div className="text-center py-12 px-4">
            <ListMusic className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Queue is empty</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Play a track from an album or playlist to fill the queue</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
