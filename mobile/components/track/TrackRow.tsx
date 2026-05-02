import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Music, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore, useAuthStore, getApi, formatDuration } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';

interface TrackRowProps {
  track: TrackItem & { isLiked?: boolean };
  queue?: TrackItem[];
  index?: number;
  showAgent?: boolean;
  showLike?: boolean;
}

export function TrackRow({ track, queue, index, showAgent = true, showLike = true }: TrackRowProps) {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const isActive = currentTrack?.id === track.id;
  const [liked, setLiked] = useState<boolean>(Boolean(track.isLiked));
  const [likeBusy, setLikeBusy] = useState(false);

  // Sync from prop changes (parent may update after a refetch).
  useEffect(() => {
    setLiked(Boolean(track.isLiked));
  }, [track.isLiked, track.id]);

  const handlePlay = () => {
    if (isActive) togglePlay();
    else playTrack(track, queue);
  };

  const handleLike = async () => {
    if (likeBusy) return;
    if (!isAuthenticated) {
      Alert.alert('Sign in to like', 'Create a free account to save tracks to your library.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeBusy(true);
    try {
      const res = await getApi().post(`/social/likes/${track.id}`);
      setLiked(Boolean(res.data?.liked));
    } catch {
      setLiked(wasLiked);
    } finally {
      setLikeBusy(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePlay}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: isActive ? tokens.accentSoft : 'transparent',
      }}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${track.agent.name}`}
    >
      {index !== undefined && (
        <View style={{ width: 28, alignItems: 'center', marginRight: 4 }}>
          {isActive && isPlaying ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
              {[6, 10, 7].map((h, i) => (
                <View
                  key={i}
                  style={{
                    width: 2,
                    height: h,
                    backgroundColor: tokens.accent,
                    borderRadius: 1,
                  }}
                />
              ))}
            </View>
          ) : (
            <Text
              style={{
                color: isActive ? tokens.accent : tokens.textMute,
                fontSize: 13,
                fontWeight: '500',
                fontFamily: isVintage ? tokens.fontMono : undefined,
              }}
            >
              {index + 1}
            </Text>
          )}
        </View>
      )}

      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: isVintage ? tokens.radiusSm : 8,
          overflow: 'hidden',
          backgroundColor: tokens.card,
          marginRight: 12,
        }}
      >
        {track.coverArt ? (
          <Image
            source={{ uri: track.coverArt }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={track.id}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
            <Music size={18} color={tokens.textMute} />
          </View>
        )}
      </View>

      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            color: isActive ? tokens.accent : tokens.text,
            fontSize: 14,
            fontWeight: '600',
            fontFamily: isVintage ? tokens.fontDisplay : undefined,
          }}
        >
          {track.title}
        </Text>
        {showAgent && (
          <TouchableOpacity onPress={() => router.push(`/agent/${track.agent.slug}`)} hitSlop={4}>
            <Text numberOfLines={1} style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>
              {track.agent.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showLike && (
        <TouchableOpacity
          onPress={handleLike}
          disabled={likeBusy}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike track' : 'Like track'}
          style={{ paddingHorizontal: 6, paddingVertical: 4, marginRight: 4 }}
        >
          <Heart
            size={18}
            color={liked ? (isVintage ? tokens.brand : '#ef4444') : tokens.textMute}
            fill={liked ? (isVintage ? tokens.brand : '#ef4444') : 'none'}
          />
        </TouchableOpacity>
      )}

      <Text
        style={{
          color: tokens.textMute,
          fontSize: 12,
          marginRight: 8,
          fontFamily: isVintage ? tokens.fontMono : undefined,
        }}
      >
        {formatDuration(track.duration)}
      </Text>
    </TouchableOpacity>
  );
}
