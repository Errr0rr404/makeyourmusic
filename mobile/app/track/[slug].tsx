import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, TextInput, Share, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { getApi, usePlayerStore, useAuthStore, formatDuration, formatCount, formatDate } from '@makeyourmusic/shared';
import type { Track, Comment } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import {
  Play, Pause, Heart, Share2, MessageCircle, ArrowLeft, Cpu, Send, Download, Check, Music,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { downloadTrack, isTrackDownloaded, removeDownload, DownloadAuthRequiredError } from '../../services/downloadService';
import { Lyrics } from '../../components/track/Lyrics';
import { asSlug } from '../../lib/validateSlug';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function TrackDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();

  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (track?.id) {
      isTrackDownloaded(track.id).then(setDownloaded).catch(() => {});
    }
  }, [track?.id]);

  const handleDownload = async () => {
    if (!track) return;
    if (!isAuthenticated) {
      Alert.alert(
        'Sign in to save offline',
        'Create a free account to download tracks for offline listening.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }
    if (downloaded) {
      Alert.alert('Remove download?', 'This track will no longer be available offline.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeDownload(track.id);
            setDownloaded(false);
          },
        },
      ]);
      return;
    }
    setDownloading(true);
    try {
      await downloadTrack(track);
      setDownloaded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (err instanceof DownloadAuthRequiredError) {
        Alert.alert(
          'Sign in to save offline',
          'Create a free account to download tracks.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
          ],
        );
      } else {
        Alert.alert('Download failed', err.message || 'Could not save for offline');
      }
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const safeSlug = asSlug(slug);
    if (!safeSlug) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const api = getApi();
        const trackRes = await api.get(`/tracks/${safeSlug}`);
        if (cancelled) return;
        const t = trackRes.data.track || trackRes.data;
        setTrack(t);
        setLiked(t.isLiked || false);
        setLikeCount(t._count?.likes || t.likeCount || 0);

        if (t?.id) {
          try {
            const commentsRes = await api.get(`/social/comments/${t.id}`);
            if (!cancelled) setComments(commentsRes.data.comments || []);
          } catch {
            if (!cancelled) setComments([]);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load track');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const handleShare = async () => {
    if (!track) return;
    try {
      await Share.share({
        message: `Listen to "${track.title}" by ${track.agent.name} on MakeYourMusic`,
        url: `https://makeyourmusic.ai/track/${track.slug}`,
      });
      const api = getApi();
      api.post(`/social/shares/${track.id}`, { platform: 'native' }).catch(() => {});
    } catch {
      // user cancelled
    }
  };

  const handlePlay = () => {
    if (!track) return;
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLike = async () => {
    if (!track) return;
    if (!isAuthenticated) {
      Alert.alert(
        'Sign in to like tracks',
        'Create a free account to save tracks to your library.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
        ],
      );
      return;
    }
    // Optimistic toggle so the heart fills instantly
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const api = getApi();
      const res = await api.post(`/social/likes/${track.id}`);
      // Sync to authoritative response in case the optimistic guess was wrong
      // (e.g. concurrent like from another device).
      setLiked(res.data.liked);
    } catch (err) {
      // Roll back on failure
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      Alert.alert('Like failed', 'Could not update this track right now.');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !track || submitting) return;
    setSubmitting(true);
    try {
      const api = getApi();
      const res = await api.post(`/social/comments/${track.id}`, { content: newComment.trim() });
      setComments((prev) => [res.data.comment, ...prev]);
      setNewComment('');
    } catch (err: any) {
      Alert.alert('Comment failed', err?.response?.data?.error || 'Could not post your comment right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  if (error || !track) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: tokens.textMute, fontSize: 15, marginBottom: 16, textAlign: 'center' }}>
          {error || 'Track not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: tokens.accent, fontSize: 15, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = currentTrack?.id === track.id;
  const heartColor = liked ? (isVintage ? tokens.brand : '#ef4444') : tokens.textMute;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={tokens.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Cover Art */}
          <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24 }}>
            <View
              style={{
                width: 256,
                height: 256,
                borderRadius: isVintage ? tokens.radiusLg : 20,
                overflow: 'hidden',
                backgroundColor: tokens.card,
                shadowColor: '#000',
                shadowOpacity: tokens.isDark ? 0.4 : 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10,
              }}
            >
              {((track as Track & { musicVideoUrl?: string | null; previewVideoUrl?: string | null }).musicVideoUrl
                || (track as Track & { previewVideoUrl?: string | null }).previewVideoUrl) ? (
                <Video
                  source={{ uri: ((track as Track & { musicVideoUrl?: string | null }).musicVideoUrl as string)
                    || ((track as Track & { previewVideoUrl?: string | null }).previewVideoUrl as string) }}
                  posterSource={track.coverArt ? { uri: track.coverArt } : undefined}
                  usePoster
                  style={{ width: 256, height: 256 }}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  isMuted
                />
              ) : track.coverArt ? (
                <Image
                  source={{ uri: track.coverArt }}
                  style={{ width: 256, height: 256 }}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                  recyclingKey={track.id}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
                  <Music size={64} color={tokens.textMute} />
                </View>
              )}
            </View>
          </View>

          {/* Track Info */}
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                color: tokens.text,
                fontSize: 24,
                fontWeight: '700',
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                textTransform: isVintage ? 'uppercase' : undefined,
                letterSpacing: isVintage ? 0.5 : undefined,
              }}
            >
              {track.title}
            </Text>
            <TouchableOpacity onPress={() => router.push(`/agent/${track.agent.slug}`)} hitSlop={4}>
              <Text style={{ color: tokens.accent, fontSize: 16, marginTop: 4 }}>{track.agent.name}</Text>
            </TouchableOpacity>

            {track.genre && (
              <TouchableOpacity
                onPress={() => router.push(`/genre/${track.genre!.slug}`)}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: tokens.card,
                  borderWidth: 1,
                  borderColor: tokens.border,
                }}
              >
                <Text style={{ color: tokens.textMute, fontSize: 12 }}>{track.genre.name}</Text>
              </TouchableOpacity>
            )}

            {/* Stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
              <Text style={{ color: tokens.textMute, fontSize: 13 }}>{formatCount(track.playCount)} plays</Text>
              <Text style={{ color: tokens.textMute, fontSize: 13 }}>{formatDuration(track.duration)}</Text>
              <Text style={{ color: tokens.textMute, fontSize: 13 }}>{formatDate(track.createdAt)}</Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                onPress={handlePlay}
                style={{
                  backgroundColor: tokens.brand,
                  borderRadius: 28,
                  width: 56,
                  height: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  shadowColor: tokens.brand,
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel={isActive && isPlaying ? 'Pause' : 'Play'}
              >
                {isActive && isPlaying ? (
                  <Pause size={24} color={tokens.brandText} fill={tokens.brandText} />
                ) : (
                  <Play size={24} color={tokens.brandText} fill={tokens.brandText} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLike}
                style={{ padding: 10 }}
                accessibilityRole="button"
                accessibilityLabel={liked ? 'Unlike' : 'Like'}
              >
                <Heart size={24} color={heartColor} fill={liked ? heartColor : 'none'} />
              </TouchableOpacity>

              <Text style={{ color: tokens.textMute, fontSize: 13, marginRight: 8 }}>
                {formatCount(likeCount)}
              </Text>

              <TouchableOpacity
                style={{ padding: 10 }}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share track"
              >
                <Share2 size={22} color={tokens.textMute} />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 10 }}
                onPress={handleDownload}
                disabled={downloading}
                accessibilityLabel={downloaded ? 'Remove download' : 'Download for offline'}
                accessibilityRole="button"
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={tokens.brand} />
                ) : downloaded ? (
                  <Check size={22} color={tokens.ledGreen} />
                ) : (
                  <Download size={22} color={tokens.textMute} />
                )}
              </TouchableOpacity>
            </View>

            {/* Lyrics */}
            {track.lyrics ? (
              <View style={{ marginTop: 24 }}>
                <Lyrics lyrics={track.lyrics} />
              </View>
            ) : null}

            {/* AI Attribution */}
            {(track.aiModel || track.aiPrompt) && (
              <View
                style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: tokens.card,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  borderRadius: tokens.radiusLg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Cpu size={16} color={tokens.accent} />
                  <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                    AI Attribution
                  </Text>
                </View>
                {track.aiModel && (
                  <Text style={{ color: tokens.textMute, fontSize: 13 }}>Model: {track.aiModel}</Text>
                )}
                {track.aiPrompt && (
                  <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }} numberOfLines={3}>
                    Prompt: {track.aiPrompt}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Comments */}
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <MessageCircle size={18} color={tokens.textMute} />
              <Text style={{ color: tokens.text, fontSize: 17, fontWeight: '700', marginLeft: 8 }}>
                Comments ({comments.length})
              </Text>
            </View>

            {isAuthenticated ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: tokens.card,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    borderRadius: tokens.radiusLg,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: tokens.text,
                    fontSize: 14,
                    marginRight: 8,
                    minHeight: 44,
                  }}
                  placeholder="Add a comment..."
                  placeholderTextColor={tokens.textMute}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleComment}
                  disabled={!newComment.trim() || submitting}
                  style={{ padding: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                >
                  <Send size={20} color={newComment.trim() ? tokens.accent : tokens.borderStrong} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{
                  marginBottom: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: tokens.card,
                  borderRadius: tokens.radiusLg,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign in to comment"
              >
                <Text style={{ color: tokens.textMute, fontSize: 14 }}>Sign in to leave a comment</Text>
                <Text style={{ color: tokens.accent, fontSize: 14, fontWeight: '600' }}>Sign in</Text>
              </TouchableOpacity>
            )}

            {comments.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: tokens.textMute, fontSize: 13 }}>
                  Be the first to comment.
                </Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View
                  key={comment.id}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    backgroundColor: tokens.card,
                    borderRadius: tokens.radiusLg,
                    borderWidth: 1,
                    borderColor: tokens.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>
                      {comment.user.displayName || comment.user.username}
                    </Text>
                    <Text style={{ color: tokens.textMute, fontSize: 11, marginLeft: 8 }}>
                      {formatDate(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ color: tokens.textSoft, fontSize: 13, lineHeight: 18 }}>
                    {comment.content}
                  </Text>
                </View>
              ))
            )}
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </>
  );
}
