import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '@makeyourmusic/shared';

export function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay, nextTrack, progress, duration } = usePlayerStore();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View className="absolute bottom-[85px] left-0 right-0 bg-mym-surface border-t border-mym-border">
      {/* Progress bar */}
      <View className="h-0.5 bg-mym-border">
        <View
          className="h-full bg-mym-accent"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      <TouchableOpacity
        className="flex-row items-center px-4 py-2"
        onPress={() => router.push('/player')}
        activeOpacity={0.8}
      >
        {/* Cover art */}
        <View className="w-11 h-11 rounded-lg overflow-hidden bg-mym-card mr-3">
          {currentTrack.coverArt ? (
            <Image
              source={{ uri: currentTrack.coverArt }}
              style={{ width: 44, height: 44 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={currentTrack.id}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-mym-card">
              <Text className="text-lg">🎵</Text>
            </View>
          )}
        </View>

        {/* Track info */}
        <View className="flex-1 mr-3">
          <Text className="text-mym-text text-sm font-semibold" numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-mym-muted text-xs" numberOfLines={1}>
            {currentTrack.agent.name}
          </Text>
        </View>

        {/* Controls */}
        <TouchableOpacity
          onPress={togglePlay}
          className="p-2 mr-1"
          activeOpacity={0.6}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isPlaying ? (
            <Pause size={22} color="#fafafa" fill="#fafafa" />
          ) : (
            <Play size={22} color="#fafafa" fill="#fafafa" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={nextTrack}
          className="p-2"
          activeOpacity={0.6}
          accessibilityLabel="Next track"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SkipForward size={20} color="#fafafa" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
