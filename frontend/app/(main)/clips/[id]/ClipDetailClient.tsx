'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from 'sonner';
import {
  Heart, MessageCircle, Share2, Download, Copy, Loader2, Music2,
  Globe, LockKeyhole, Link as LinkIcon, Trash2, Pause, Play, AlertCircle,
} from 'lucide-react';

interface Clip {
  id: string;
  userId: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  caption?: string | null;
  hashtags: string[];
  videoUrl: string;
  thumbnail?: string | null;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  audioStartMs: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
  track: {
    id: string;
    title: string;
    slug: string;
    coverArt?: string | null;
    duration: number;
    agent: { id: string; name: string; slug: string; avatar?: string | null };
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; displayName?: string | null; avatar?: string | null };
  replies?: Comment[];
}

export function ClipDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [clip, setClip] = useState<Clip | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const viewCountedRef = useRef(false);

  // Fetch clip
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/clips/${id}`).then((r) => {
      if (!active) return;
      setClip(r.data.clip);
      setLiked(Boolean(r.data.liked));
    }).catch(() => {
      if (active) setNotFound(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  // Fetch comments after the clip resolves
  useEffect(() => {
    if (!clip) return;
    api.get(`/clips/${clip.id}/comments`).then((r) => {
      setComments(r.data.comments || []);
    }).catch(() => {});
  }, [clip]);

  // Count a view once playback gets past 3 seconds
  const onVideoTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || viewCountedRef.current || !clip) return;
    if (v.currentTime > 3) {
      viewCountedRef.current = true;
      api.post(`/clips/${clip.id}/view`).catch(() => {});
    }
  }, [clip]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleLike = async () => {
    if (!clip) return;
    if (!user) {
      toast.error('Log in to like clips');
      return;
    }
    const prev = liked;
    setLiked(!prev);
    setClip({ ...clip, likeCount: clip.likeCount + (prev ? -1 : 1) });
    try {
      const r = await api.post(`/clips/${clip.id}/likes`);
      setLiked(Boolean(r.data.liked));
    } catch {
      // revert
      setLiked(prev);
      setClip({ ...clip, likeCount: clip.likeCount });
      toast.error('Could not save like');
    }
  };

  const handleComment = async () => {
    if (!clip || !commentInput.trim()) return;
    if (!user) {
      toast.error('Log in to comment');
      return;
    }
    setCommentBusy(true);
    try {
      const r = await api.post(`/clips/${clip.id}/comments`, { content: commentInput.trim() });
      setComments([r.data.comment, ...comments]);
      setCommentInput('');
      setClip({ ...clip, commentCount: clip.commentCount + 1 });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || 'Could not post comment');
    } finally {
      setCommentBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!clip) return;
    if (!confirm('Delete this clip? This cannot be undone.')) return;
    try {
      await api.delete(`/clips/${clip.id}`);
      toast.success('Clip deleted');
      router.push('/profile');
    } catch {
      toast.error('Could not delete');
    }
  };

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/clips/${id}` : '';

  const copyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
      api.post(`/clips/${id}/shares`, { platform: 'copy' }).catch(() => {});
    } catch {
      toast.error('Could not copy');
    }
  };

  const shareTo = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'reddit') => {
    if (!shareLink || !clip) return;
    const text = clip.caption || `Check out this clip on music4ai`;
    const u = encodeURIComponent(shareLink);
    const t = encodeURIComponent(text);
    const url =
      platform === 'twitter'    ? `https://twitter.com/intent/tweet?url=${u}&text=${t}`
      : platform === 'facebook' ? `https://www.facebook.com/sharer/sharer.php?u=${u}`
      : platform === 'whatsapp' ? `https://wa.me/?text=${t}%20${u}`
      : platform === 'telegram' ? `https://t.me/share/url?url=${u}&text=${t}`
                                : `https://www.reddit.com/submit?url=${u}&title=${t}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    api.post(`/clips/${id}/shares`, { platform }).catch(() => {});
  };

  const handleNativeShare = async () => {
    if (!clip || typeof navigator.share !== 'function') {
      setShareOpen(true);
      return;
    }
    try {
      await navigator.share({
        title: clip.caption || 'Clip on music4ai',
        text: clip.caption || `Sound: ${clip.track.title}`,
        url: shareLink,
      });
      api.post(`/clips/${id}/shares`, { platform: 'other' }).catch(() => {});
    } catch {
      // user cancelled
    }
  };

  const handleDownload = async () => {
    if (!clip) return;
    setDownloading(true);
    try {
      const r = await api.get(`/clips/${clip.id}/download`);
      const url: string = r.data.url;
      // Trigger download in a new tab — Cloudinary URLs without fl_attachment
      // open inline; opening a tab is the simplest cross-browser path.
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not get download');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--accent))]" />
      </div>
    );
  }

  if (notFound || !clip) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-1">Clip not found</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          It may be private or no longer available.
        </p>
        <Link
          href="/feed"
          className="mt-4 inline-block px-4 py-2 rounded-full bg-[hsl(var(--primary))] text-white text-sm font-medium"
        >
          Browse feed
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === clip.userId;
  const author = clip.user.displayName || clip.user.username;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6">
        {/* Video column */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-black border border-[hsl(var(--border))] relative aspect-[9/16] max-h-[80vh] mx-auto">
            <video
              ref={videoRef}
              src={clip.videoUrl}
              poster={clip.thumbnail || undefined}
              playsInline
              loop
              onTimeUpdate={onVideoTimeUpdate}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              className="w-full h-full object-contain bg-black"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {!playing && (
                <span className="w-16 h-16 rounded-full bg-black/40 backdrop-blur grid place-items-center group-hover:scale-105 transition-transform">
                  <Play className="w-7 h-7 text-white" />
                </span>
              )}
              {playing && (
                <span className="w-16 h-16 rounded-full bg-black/40 backdrop-blur opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
                  <Pause className="w-7 h-7 text-white" />
                </span>
              )}
            </button>

            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
              <VisibilityBadge visibility={clip.visibility} />
            </div>
          </div>

          {/* Action rail (under video on mobile, right side on desktop is the meta) */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <ActionButton
              icon={<Heart className={`w-5 h-5 ${liked ? 'fill-current text-pink-500' : ''}`} />}
              label={String(clip.likeCount)}
              onClick={handleLike}
            />
            <ActionButton
              icon={<MessageCircle className="w-5 h-5" />}
              label={String(clip.commentCount)}
              onClick={() => {
                document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <ActionButton
              icon={<Share2 className="w-5 h-5" />}
              label="Share"
              onClick={handleNativeShare}
            />
            <ActionButton
              icon={downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              label="Save"
              onClick={handleDownload}
            />
          </div>
        </div>

        {/* Meta + comments column */}
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
            <div className="flex items-start gap-3">
              <Link href={`/profile/${clip.user.username}`} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[hsl(var(--secondary))]">
                  {clip.user.avatar ? (
                    <img src={clip.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${clip.user.username}`}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {author}
                </Link>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(clip.createdAt).toLocaleDateString()} · {clip.viewCount.toLocaleString()} views
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="text-[hsl(var(--muted-foreground))] hover:text-red-400"
                  aria-label="Delete clip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {clip.caption && (
              <p className="mt-3 text-sm text-white whitespace-pre-line">{clip.caption}</p>
            )}
            {clip.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {clip.hashtags.map((h) => (
                  <span key={h} className="text-xs text-[hsl(var(--accent))]">#{h}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sound */}
          <Link
            href={`/track/${clip.track.slug}`}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-white/10 flex items-center gap-3 hover:border-white/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-md bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
              {clip.track.coverArt ? (
                <img src={clip.track.coverArt} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <Music2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Sound</p>
              <p className="text-sm font-semibold text-white truncate">{clip.track.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{clip.track.agent.name}</p>
            </div>
            <Music2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </Link>

          {/* Comments */}
          <div id="comments" className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
            <h2 className="text-sm font-bold text-white mb-3">
              Comments <span className="text-[hsl(var(--muted-foreground))] font-normal">({clip.commentCount})</span>
            </h2>
            {user ? (
              <div className="flex gap-2 mb-4">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleComment(); } }}
                  placeholder="Add a comment"
                  maxLength={2000}
                  className="flex-1 h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                />
                <button
                  onClick={handleComment}
                  disabled={!commentInput.trim() || commentBusy}
                  className="px-4 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium disabled:opacity-50"
                >
                  {commentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                </button>
              </div>
            ) : (
              <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                <Link href="/login" className="text-[hsl(var(--accent))] hover:underline">Log in</Link> to comment.
              </p>
            )}
            {comments.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
                      {c.user.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-semibold text-white">{c.user.displayName || c.user.username}</span>
                        <span className="text-[hsl(var(--muted-foreground))] ml-1.5">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                      <p className="text-sm text-white/90 whitespace-pre-line">{c.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Share fallback sheet */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setShareOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4"
          >
            <h3 className="text-sm font-bold text-white mb-3">Share this clip</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <ShareBtn label="Twitter" onClick={() => shareTo('twitter')} />
              <ShareBtn label="Facebook" onClick={() => shareTo('facebook')} />
              <ShareBtn label="WhatsApp" onClick={() => shareTo('whatsapp')} />
              <ShareBtn label="Telegram" onClick={() => shareTo('telegram')} />
              <ShareBtn label="Reddit" onClick={() => shareTo('reddit')} />
              <ShareBtn label="Copy link" onClick={copyLink} icon={<Copy className="w-4 h-4" />} />
            </div>
            <button
              onClick={() => setShareOpen(false)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' }) {
  if (visibility === 'PUBLIC') return <><Globe className="w-3 h-3" /> Public</>;
  if (visibility === 'UNLISTED') return <><LinkIcon className="w-3 h-3" /> Unlisted</>;
  return <><LockKeyhole className="w-3 h-3" /> Private</>;
}

function ActionButton({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-white/20 text-white text-xs font-medium transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ShareBtn({
  label, onClick, icon,
}: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[hsl(var(--secondary))] hover:bg-white/10 text-white text-xs font-medium"
    >
      {icon}
      {label}
    </button>
  );
}
