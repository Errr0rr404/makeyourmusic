import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, SkipForward, Music } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';
import { usePlayerStore } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';
import { TapeProgress } from '../vintage/TapeProgress';

export function MiniPlayer() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { currentTrack, isPlaying, togglePlay, nextTrack, progress, duration } = usePlayerStore();

  if (!currentTrack) return null;

  // Hide on the full-screen player itself.
  if (segments[segments.length - 1] === 'player') return null;

  // Match the (tabs) tab-bar formula so the mini-player floats just above it
  // on tab screens. On non-tab screens (track/agent/etc.) the tab bar is gone,
  // so we sit on the safe-area inset instead.
  const onTabs = segments[0] === '(tabs)';
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12);
  const tabBarHeight = 56 + bottomInset;
  const bottom = onTabs ? tabBarHeight : Math.max(insets.bottom, 8);

  const progressPercent = duration > 0 ? progress / duration : 0;

  return (
    <View
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        right: 0,
        backgroundColor: tokens.surface,
        borderTopWidth: 1,
        borderTopColor: tokens.border,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
      }}
    >
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
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}
        onPress={() => router.push('/player')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Open player. Now playing ${currentTrack.title} by ${currentTrack.agent.name}`}
      >
        {/* Cover art / cassette window */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: isVintage ? tokens.radiusSm : 8,
            overflow: 'hidden',
            backgroundColor: isVintage ? tokens.metalShadow : tokens.card,
            marginRight: 12,
            borderWidth: isVintage ? 1 : 0,
            borderColor: tokens.borderStrong,
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
              <Music size={20} color={tokens.textMute} />
            </View>
          )}
        </View>

        {/* Track info */}
        <View style={{ flex: 1, marginRight: 8 }}>
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
                  borderColor: tokens.borderStrong,
                }
              : { padding: 8, marginRight: 4 }
          }
        >
          {isPlaying ? (
            <Pause
              size={isVintage ? 18 : 22}
              color={isVintage ? tokens.brandText : tokens.text}
              fill={isVintage ? tokens.brandText : tokens.text}
            />
          ) : (
            <Play
              size={isVintage ? 18 : 22}
              color={isVintage ? tokens.brandText : tokens.text}
              fill={isVintage ? tokens.brandText : tokens.text}
            />
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
