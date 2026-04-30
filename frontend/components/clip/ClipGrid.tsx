'use client';

import Link from 'next/link';
import { Film, Globe, LockKeyhole, Link as LinkIcon, Heart, Eye } from 'lucide-react';

export interface ClipGridItem {
  id: string;
  thumbnail?: string | null;
  caption?: string | null;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  durationMs: number;
  viewCount: number;
  likeCount: number;
  user?: { username: string; displayName?: string | null; avatar?: string | null };
  track?: { title: string };
}

export function ClipGrid({
  clips,
  showAuthor = false,
  emptyState,
}: {
  clips: ClipGridItem[];
  showAuthor?: boolean;
  emptyState?: React.ReactNode;
}) {
  if (clips.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        {emptyState ?? (
          <>
            <Film className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No clips yet.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {clips.map((c) => {
        const seconds = Math.max(0, Math.round(c.durationMs / 1000));
        return (
          <li key={c.id}>
            <Link
              href={`/clips/${c.id}`}
              className="block relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-[hsl(var(--border))] hover:border-white/30 transition-colors group"
            >
              {c.thumbnail ? (
                <img
                  src={c.thumbnail}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-[hsl(var(--muted-foreground))]">
                  <Film className="w-6 h-6" />
                </div>
              )}

              {/* Visibility chip */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] flex items-center gap-1">
                {c.visibility === 'PUBLIC' ? (
                  <><Globe className="w-3 h-3" /> Public</>
                ) : c.visibility === 'UNLISTED' ? (
                  <><LinkIcon className="w-3 h-3" /> Unlisted</>
                ) : (
                  <><LockKeyhole className="w-3 h-3" /> Private</>
                )}
              </div>

              {/* Duration */}
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-mono">
                0:{seconds.toString().padStart(2, '0')}
              </div>

              {/* Caption + stats */}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                {showAuthor && c.user && (
                  <p className="text-[11px] text-white/80 truncate">
                    @{c.user.username}
                  </p>
                )}
                {c.caption && (
                  <p className="text-xs text-white line-clamp-2">{c.caption}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-[10px] text-white/70">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{c.viewCount}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.likeCount}</span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
