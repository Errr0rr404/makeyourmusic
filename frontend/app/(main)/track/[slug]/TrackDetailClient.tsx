'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { usePlayerStore } from '@/lib/store/playerStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Play, Pause, Heart, Share2, Clock, Music, MessageSquare, Bot, AlertCircle, Sparkles, ListPlus, Pencil, Trash2, Check, X, Flag, Radio, Code, DollarSign, Film } from 'lucide-react';
import { ClipGrid } from '@/components/clip/ClipGrid';
import { formatDuration } from '@makeyourmusic/shared';
import { toast } from '@/lib/store/toastStore';
import { Lyrics } from '@/components/track/Lyrics';
import { TrackCard } from '@/components/track/TrackCard';
import { TrackStems } from '@/components/track/TrackStems';
import { AddToPlaylistDialog } from '@/components/track/AddToPlaylistDialog';
import { ReportDialog } from '@/components/track/ReportDialog';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function TrackDetailClient({ slug }: { slug: string }) {
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const [track, setTrack] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [trackClips, setTrackClips] = useState<any[]>([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const { currentTrack, isPlaying, playTrack, togglePlay, startRadio } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    // Reset state when slug changes — without this, briefly-stale data from
    // the previous slug stays on screen while the new fetch is in flight.
    setLoading(true);
    setTrack(null);
    setComments([]);
    setSimilar([]);
    setTrackClips([]);
    setShowAddToPlaylist(false);
    setShowReport(false);

    async function load() {
      try {
        setError(null);
        const trackRes = await api.get(`/tracks/${slug}`);
        if (cancelled) return;
        const fetchedTrack = trackRes.data.track;
        setTrack(fetchedTrack);

        if (fetchedTrack?.id) {
          const [commentsRes, similarRes, clipsRes] = await Promise.allSettled([
            api.get(`/social/comments/${fetchedTrack.id}`),
            api.get(`/tracks/${fetchedTrack.slug || fetchedTrack.id}/similar?limit=12`),
            api.get(`/clips?trackId=${fetchedTrack.id}&limit=12`),
          ]);
          if (cancelled) return;
          if (commentsRes.status === 'fulfilled') {
            setComments(commentsRes.value.data.comments || []);
          } else {
            setComments([]);
          }
          if (similarRes.status === 'fulfilled') {
            setSimilar(similarRes.value.data.tracks || []);
          }
          if (clipsRes.status === 'fulfilled') {
            setTrackClips(clipsRes.value.data.clips || []);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load track');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const handlePlay = () => {
    if (!track) return;
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  // Auto-dismiss action errors - removed, now using toast system

  const handleLike = async () => {
    if (!track || !isAuthenticated) {
      if (!isAuthenticated) toast.warning('Log in to like tracks');
      return;
    }
    try {
      const res = await api.post(`/social/likes/${track.id}`);
      setTrack({ ...track, isLiked: res.data.liked, likeCount: track.likeCount + (res.data.liked ? 1 : -1) });
      toast.success(res.data.liked ? 'Added to liked tracks' : 'Removed from liked tracks');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to like track');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !track) return;
    try {
      const res = await api.post(`/social/comments/${track.id}`, { content: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
      toast.success('Comment posted');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const handleShare = async () => {
    if (!track) return;
    const url = `${window.location.origin}/track/${track.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `Listen to "${track.title}" by ${track.agent?.name || 'an AI agent'} on MakeYourMusic`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
      const platform = typeof navigator.share === 'function' ? 'native' : 'copy';
      api.post(`/social/shares/${track.id}`, { platform }).catch(() => {});
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to share track');
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
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
            <button
              onClick={() => { void startRadio(track); toast.success('AI Radio started — endless tracks like this'); }}
              title="Start AI Radio"
              className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:scale-[1.03] transition-transform"
            >
              <Radio className="w-4 h-4" />
              AI Radio
            </button>
            <button onClick={handleLike} aria-label={track.isLiked ? 'Unlike' : 'Like'}
              className={`p-2.5 rounded-full border transition-colors ${track.isLiked ? 'border-pink-500 text-pink-500' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30'}`}>
              <Heart className="w-5 h-5" fill={track.isLiked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleShare} aria-label="Share track"
              className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
                const origin = apiBase ? apiBase.replace(/\/api\/?$/, '') : window.location.origin;
                const snippet = `<iframe src="${origin}/embed/track/${track.slug}" width="320" height="120" frameborder="0" allow="autoplay" loading="lazy"></iframe>`;
                await navigator.clipboard.writeText(snippet);
                toast.success('Embed snippet copied');
              }}
              aria-label="Copy embed code"
              title="Copy embed code"
              className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors">
              <Code className="w-5 h-5" />
            </button>
            {(track as any).licenseable && (track as any).licensePriceCents && (
              <button
                onClick={async () => {
                  try {
                    const { data } = await api.post<{ checkoutUrl: string }>('/licenses/checkout', {
                      trackId: track.id,
                      kind: 'sync',
                    });
                    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
                  } catch (err: any) {
                    toast.error(err?.response?.data?.error || 'Failed to start checkout');
                  }
                }}
                title={`License this track for $${((track as any).licensePriceCents / 100).toFixed(2)}`}
                className="inline-flex items-center gap-1 h-10 px-4 rounded-full border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 text-sm font-medium transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                License ${((track as any).licensePriceCents / 100).toFixed(2)}
              </button>
            )}
            {isAuthenticated && (
              <>
                <button
                  onClick={() => setShowAddToPlaylist(true)}
                  aria-label="Add to playlist"
                  className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/30 transition-colors"
                >
                  <ListPlus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  aria-label="Report track"
                  className="p-2.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:border-red-400/30 transition-colors"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {track && (
        <>
          <AddToPlaylistDialog
            trackId={track.id}
            trackTitle={track.title}
            open={showAddToPlaylist}
            onClose={() => setShowAddToPlaylist(false)}
          />
          <ReportDialog
            targetId={track.id}
            targetType="track"
            targetTitle={track.title}
            open={showReport}
            onClose={() => setShowReport(false)}
          />
        </>
      )}

      {/* Lyrics */}
      {track.lyrics && (
        <div className="mb-8">
          <Lyrics lyrics={track.lyrics} trackId={track.id} />
        </div>
      )}

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

      <TrackStems
        trackId={track.id}
        trackSlug={track.slug}
        isOwner={Boolean(user?.id && track.agent?.ownerId === user.id)}
      />

      {/* Clips with this sound */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-bold text-white">Clips using this sound</h3>
            {trackClips.length > 0 && (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">({trackClips.length})</span>
            )}
          </div>
          {isAuthenticated && (
            <Link
              href={`/create/clip?trackId=${track.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-200 text-xs font-medium hover:scale-105 transition-transform"
            >
              <Film className="w-3.5 h-3.5" /> Use this sound
            </Link>
          )}
        </div>
        {trackClips.length > 0 ? (
          <ClipGrid clips={trackClips} showAuthor />
        ) : (
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No clips with this sound yet. {isAuthenticated ? 'Be the first.' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Similar tracks */}
      {similar.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[hsl(var(--accent))]" />
            <h3 className="text-lg font-bold text-white">More like this</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {similar.slice(0, 12).map((t) => (
              <TrackCard key={t.id} track={t} tracks={similar} />
            ))}
          </div>
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
          {comments.map((comment) => {
            const isOwn = user?.id === comment.user.id;
            const isEditing = editingCommentId === comment.id;
            return (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {comment.user.displayName?.[0] || comment.user.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{comment.user.displayName || comment.user.username}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(comment.createdAt).toLocaleDateString()}
                      {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' · edited'}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        maxLength={2000}
                        autoFocus
                        className="flex-1 h-9 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                      />
                      <button
                        onClick={async () => {
                          if (!editDraft.trim() || editDraft === comment.content) {
                            setEditingCommentId(null);
                            return;
                          }
                          try {
                            const res = await api.patch(`/social/comments/${comment.id}`, { content: editDraft });
                            setComments((prev) =>
                              prev.map((c) => (c.id === comment.id ? res.data.comment : c))
                            );
                            setEditingCommentId(null);
                            toast.success('Comment updated');
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Failed to update');
                          }
                        }}
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"
                        aria-label="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-white/5 rounded-lg"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{comment.content}</p>
                  )}
                </div>
                {isOwn && !isEditing && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditDraft(comment.content);
                        setEditingCommentId(comment.id);
                      }}
                      className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 rounded"
                      aria-label="Edit comment"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete comment?',
                          message: 'This action cannot be undone.',
                          confirmLabel: 'Delete',
                          destructive: true,
                        });
                        if (!ok) return;
                        try {
                          await api.delete(`/social/comments/${comment.id}`);
                          setComments((prev) => prev.filter((c) => c.id !== comment.id));
                          toast.success('Comment deleted');
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Failed to delete');
                        }
                      }}
                      className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 rounded"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {comments.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No comments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
