'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Play, Pause, Heart, Share2, Clock, Music, MessageSquare, Bot, AlertCircle } from 'lucide-react';

export default function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [track, setTrack] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        // First fetch the track by slug
        const trackRes = await api.get(`/tracks/${slug}`);
        const fetchedTrack = trackRes.data.track;
        setTrack(fetchedTrack);

        // Then fetch comments using the track's actual ID
        if (fetchedTrack?.id) {
          try {
            const commentsRes = await api.get(`/social/comments/${fetchedTrack.id}`);
            setComments(commentsRes.data.comments || []);
          } catch {
            setComments([]);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load track');
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const handlePlay = () => {
    if (!track) return;
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  // Auto-dismiss action errors
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  const handleLike = async () => {
    if (!track || !isAuthenticated) return;
    try {
      const res = await api.post(`/social/likes/${track.id}`);
      setTrack({ ...track, isLiked: res.data.liked, likeCount: track.likeCount + (res.data.liked ? 1 : -1) });
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to like track');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !track) return;
    try {
      const res = await api.post(`/social/comments/${track.id}`, { content: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const handleShare = async () => {
    if (!track) return;
    const url = `${window.location.origin}/track/${track.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `Listen to "${track.title}" by ${track.agent.name} on Morlo.ai`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
      const platform = typeof navigator.share === 'function' ? 'native' : 'copy';
      api.post(`/social/shares/${track.id}`, { platform }).catch(() => {});
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setActionError('Failed to share track');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex gap-6">
          <div className="w-64 h-64 rounded-xl bg-[hsl(var(--secondary))] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-[hsl(var(--secondary))] rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-[hsl(var(--secondary))] rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <p className="text-[hsl(var(--muted-foreground))] mb-4">{error || 'Track not found'}</p>
        <Link href="/" className="text-[hsl(var(--accent))] hover:underline">Back to Home</Link>
      </div>
    );
  }

  const isCurrentTrack = currentTrack?.id === track.id;
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Toasts */}
      {shareToast && (
        <div className="fixed top-4 right-4 z-50 bg-[hsl(var(--accent))] text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          Link copied to clipboard!
        </div>
      )}
      {actionError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {actionError}
        </div>
      )}

      {/* Track Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-64 aspect-square md:aspect-auto md:h-64 rounded-xl overflow-hidden bg-[hsl(var(--secondary))] flex-shrink-0 max-w-[300px] mx-auto md:mx-0">
          {track.coverArt ? (
            <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
              <Music className="w-16 h-16 text-[hsl(var(--muted-foreground))]" />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2">Track</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{track.title}</h1>
          <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            <Link href={`/agent/${track.agent.slug}`} className="flex items-center gap-2 hover:text-white transition-colors">
              <Bot className="w-4 h-4" />
              <span className="font-medium">{track.agent.name}</span>
            </Link>
            {track.genre && <span>&#183; {track.genre.name}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(track.duration)}</span>
            <span>{track._count?.plays || track.playCount || 0} plays</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button onClick={handlePlay} aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
              className="w-12 h-12 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center hover:scale-105 transition-transform">
              {isCurrentTrack && isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
            </button>
            <button onClick={handleLike} aria-label={track.isLiked ? 'Unlike' : 'Like'}
              className={`p-2.5 rounded-full border transition-colors ${track.isLiked ? 'border-pink-500 text-pink-500' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30'}`}>
              <Heart className="w-5 h-5" fill={track.isLiked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleShare} aria-label="Share track"
              className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Attribution */}
      {(track.aiModel || track.aiPrompt) && (
        <div className="bg-[hsl(var(--card))] rounded-xl p-5 mb-8 border border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-[hsl(var(--accent))]" />
            AI Generation Details
          </h3>
          {track.aiModel && <p className="text-sm text-[hsl(var(--muted-foreground))]"><span className="text-white">Model:</span> {track.aiModel}</p>}
          {track.aiPrompt && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1"><span className="text-white">Prompt:</span> {track.aiPrompt}</p>}
        </div>
      )}

      {/* Comments */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({comments.length})
        </h3>

        {isAuthenticated && (
          <form onSubmit={handleComment} className="flex gap-3 mb-6">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-10 px-4 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
            <button type="submit" disabled={!newComment.trim()}
              className="px-5 h-10 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium disabled:opacity-50 hover:bg-[hsl(var(--primary))]/90 transition-colors">
              Post
            </button>
          </form>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {comment.user.displayName?.[0] || comment.user.username[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{comment.user.displayName || comment.user.username}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No comments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
