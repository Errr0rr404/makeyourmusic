import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, SkipForward, ListMusic } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';
import { TapeProgress } from '../vintage/TapeProgress';

export function MiniPlayer() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { currentTrack, isPlaying, togglePlay, nextTrack, progress, duration } = usePlayerStore();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? progress / duration : 0;

  const containerStyle = {
    position: 'absolute' as const,
    bottom: 85,
    left: 0,
    right: 0,
    backgroundColor: tokens.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
  };

  return (
    <View style={containerStyle}>
      {/* Progress bar */}
      {isVintage ? (
        <TapeProgress progress={progressPercent} height={3} />
      ) : (
        <View style={{ height: 2, backgroundColor: tokens.border }}>
          <View
            style={{ height: '100%', width: `${progressPercent * 100}%`, backgroundColor: tokens.accent }}
          />
        </View>
      )}

      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}
        onPress={() => router.push('/player')}
        activeOpacity={0.8}
      >
        {/* Cover art / cassette window */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: isVintage ? 2 : 8,
            overflow: 'hidden',
            backgroundColor: isVintage ? '#0a0604' : tokens.card,
            marginRight: 12,
            borderWidth: isVintage ? 1 : 0,
            borderColor: '#1a1009',
          }}
        >
          {currentTrack.coverArt ? (
            <Image
              source={{ uri: currentTrack.coverArt }}
              style={{ width: 44, height: 44 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={currentTrack.id}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ListMusic size={20} color={tokens.textMute} />
            </View>
          )}
        </View>

        {/* Track info */}
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.text,
              fontSize: 14,
              fontWeight: '600',
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : undefined,
              letterSpacing: isVintage ? 0.5 : undefined,
            }}
          >
            {currentTrack.title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.textMute,
              fontSize: 12,
              fontFamily: isVintage ? tokens.fontLabel : undefined,
              marginTop: 2,
            }}
          >
            {currentTrack.agent.name}
          </Text>
        </View>

        {/* Play/pause */}
        <TouchableOpacity
          onPress={togglePlay}
          activeOpacity={0.6}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={
            isVintage
              ? {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: tokens.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 4,
                  borderWidth: 1,
                  borderColor: '#1a1009',
                }
              : { padding: 8, marginRight: 4 }
          }
        >
          {isPlaying ? (
            <Pause size={isVintage ? 18 : 22} color={isVintage ? '#fff' : tokens.text} fill={isVintage ? '#fff' : tokens.text} />
          ) : (
            <Play size={isVintage ? 18 : 22} color={isVintage ? '#fff' : tokens.text} fill={isVintage ? '#fff' : tokens.text} />
          )}
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          onPress={nextTrack}
          style={{ padding: 8 }}
          activeOpacity={0.6}
          accessibilityLabel="Next track"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SkipForward size={20} color={tokens.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
