import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Music } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore, formatDuration } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';

interface TrackRowProps {
  track: TrackItem;
  queue?: TrackItem[];
  index?: number;
  showAgent?: boolean;
}

export function TrackRow({ track, queue, index, showAgent = true }: TrackRowProps) {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    playTrack(track, queue);
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
