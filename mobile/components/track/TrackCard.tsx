import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, Music } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore, formatDuration } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';

interface TrackCardProps {
  track: TrackItem;
  queue?: TrackItem[];
  size?: 'sm' | 'md';
}

export function TrackCard({ track, queue, size = 'md' }: TrackCardProps) {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const dim = size === 'sm' ? 144 : 176;

  const handlePlay = () => {
    if (isActive) togglePlay();
    else playTrack(track, queue);
  };

  return (
    <TouchableOpacity
      style={{ width: dim, marginRight: 12 }}
      onPress={() => router.push(`/track/${track.slug}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${track.title} by ${track.agent.name}`}
    >
      <View
        style={{
          width: dim,
          height: dim,
          borderRadius: isVintage ? tokens.radiusMd : 14,
          overflow: 'hidden',
          backgroundColor: tokens.card,
          marginBottom: 8,
          borderWidth: isVintage ? 1 : 0,
          borderColor: tokens.border,
        }}
      >
        {track.coverArt ? (
          <Image
            source={{ uri: track.coverArt }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={track.id}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
            <Music size={36} color={tokens.textMute} />
          </View>
        )}

        {isActive && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: tokens.brand,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>
              {isPlaying ? 'PLAYING' : 'PAUSED'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePlay}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tokens.brand,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
          activeOpacity={0.8}
          accessibilityLabel={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isActive && isPlaying ? (
            <Pause size={16} color={tokens.brandText} fill={tokens.brandText} />
          ) : (
            <Play size={16} color={tokens.brandText} fill={tokens.brandText} />
          )}
        </TouchableOpacity>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: isActive ? tokens.accent : tokens.text,
          fontSize: 14,
          fontWeight: '600',
          fontFamily: isVintage ? tokens.fontDisplay : undefined,
          letterSpacing: isVintage ? 0.5 : undefined,
        }}
      >
        {track.title}
      </Text>
      <Text numberOfLines={1} style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>
        {track.agent.name} · {formatDuration(track.duration)}
      </Text>
    </TouchableOpacity>
  );
}
