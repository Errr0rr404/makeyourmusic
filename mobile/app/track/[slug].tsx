import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { getApi, usePlayerStore, useAuthStore, formatDuration, formatCount, formatDate } from '@morlo/shared';
import type { Track, Comment } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import {
  Play,
  Pause,
  Heart,
  Share2,
  MessageCircle,
  ArrowLeft,
  Cpu,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function TrackDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();

  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrack();
  }, [slug]);

  const fetchTrack = async () => {
    try {
      const api = getApi();
      const [trackRes, commentsRes] = await Promise.all([
        api.get(`/tracks/${slug}`),
        api.get(`/social/comments/${slug}`).catch(() => ({ data: { comments: [] } })),
      ]);
      const t = trackRes.data.track || trackRes.data;
      setTrack(t);
      setLiked(t.isLiked || false);
      setLikeCount(t._count?.likes || t.likeCount || 0);
      setComments(commentsRes.data.comments || []);
    } catch (err) {
      console.error('Track fetch error:', err);
    } finally {
      setLoading(false);
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
    if (!isAuthenticated || !track) return;
    try {
      const api = getApi();
      await api.post(`/social/like/${track.id}`);
      setLiked(!liked);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Like error:', err);
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
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!track) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <Text className="text-morlo-muted">Track not found</Text>
      </View>
    );
  }

  const isActive = currentTrack?.id === track.id;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fafafa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        {/* Cover Art */}
        <View className="items-center px-6 pt-12 pb-6">
          <View className="w-64 h-64 rounded-2xl overflow-hidden bg-morlo-card shadow-xl">
            {track.coverArt ? (
              <Image
                source={{ uri: track.coverArt }}
                style={{ width: 256, height: 256 }}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-morlo-surface">
                <Text className="text-6xl">🎵</Text>
              </View>
            )}
          </View>
        </View>

        {/* Track Info */}
        <View className="px-6">
          <Text className="text-morlo-text text-2xl font-bold">{track.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/agent/${track.agent.slug}`)}>
            <Text className="text-morlo-accent text-base mt-1">{track.agent.name}</Text>
          </TouchableOpacity>

          {track.genre && (
            <TouchableOpacity
              onPress={() => router.push(`/genre/${track.genre!.slug}`)}
              className="self-start mt-2 px-3 py-1 rounded-full bg-morlo-card border border-morlo-border"
            >
              <Text className="text-morlo-muted text-xs">{track.genre.name}</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View className="flex-row items-center mt-3 space-x-4">
            <Text className="text-morlo-muted text-sm">
              {formatCount(track.playCount)} plays
            </Text>
            <Text className="text-morlo-muted text-sm ml-4">
              {formatDuration(track.duration)}
            </Text>
            <Text className="text-morlo-muted text-sm ml-4">
              {formatDate(track.createdAt)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center mt-4 space-x-3">
            <TouchableOpacity
              onPress={handlePlay}
              className="bg-morlo-accent rounded-full w-14 h-14 items-center justify-center mr-3"
            >
              {isActive && isPlaying ? (
                <Pause size={24} color="#fff" fill="#fff" />
              ) : (
                <Play size={24} color="#fff" fill="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLike} className="p-3 mr-1">
              <Heart
                size={24}
                color={liked ? '#ef4444' : '#a1a1aa'}
                fill={liked ? '#ef4444' : 'none'}
              />
            </TouchableOpacity>

            <Text className="text-morlo-muted text-sm mr-3">{formatCount(likeCount)}</Text>

            <TouchableOpacity className="p-3">
              <Share2 size={22} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* AI Attribution */}
          {(track.aiModel || track.aiPrompt) && (
            <View className="mt-6 p-4 bg-morlo-card border border-morlo-border rounded-xl">
              <View className="flex-row items-center mb-2">
                <Cpu size={16} color="#8b5cf6" />
                <Text className="text-morlo-accent text-sm font-semibold ml-2">
                  AI Attribution
                </Text>
              </View>
              {track.aiModel && (
                <Text className="text-morlo-muted text-sm">Model: {track.aiModel}</Text>
              )}
              {track.aiPrompt && (
                <Text className="text-morlo-muted text-sm mt-1" numberOfLines={3}>
                  Prompt: {track.aiPrompt}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Comments */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center mb-3">
            <MessageCircle size={18} color="#a1a1aa" />
            <Text className="text-morlo-text text-lg font-bold ml-2">
              Comments ({comments.length})
            </Text>
          </View>

          {isAuthenticated && (
            <View className="flex-row items-center mb-4">
              <TextInput
                className="flex-1 bg-morlo-card border border-morlo-border rounded-xl px-4 py-3 text-morlo-text text-sm mr-2"
                placeholder="Add a comment..."
                placeholderTextColor="#71717a"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={handleComment}
                disabled={!newComment.trim() || submitting}
                className="p-3"
              >
                <Send
                  size={20}
                  color={newComment.trim() ? '#8b5cf6' : '#2a2a2a'}
                />
              </TouchableOpacity>
            </View>
          )}

          {comments.map((comment) => (
            <View key={comment.id} className="mb-4 p-3 bg-morlo-card rounded-xl">
              <View className="flex-row items-center mb-1">
                <Text className="text-morlo-text text-sm font-semibold">
                  {comment.user.displayName || comment.user.username}
                </Text>
                <Text className="text-morlo-muted text-xs ml-2">
                  {formatDate(comment.createdAt)}
                </Text>
              </View>
              <Text className="text-morlo-muted text-sm">{comment.content}</Text>
            </View>
          ))}
        </View>
      </ScreenContainer>
    </>
  );
}
