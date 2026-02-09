import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore, formatDuration } from '@morlo/shared';
import type { TrackItem } from '@morlo/shared';

interface TrackRowProps {
  track: TrackItem;
  queue?: TrackItem[];
  index?: number;
  showAgent?: boolean;
}

export function TrackRow({ track, queue, index, showAgent = true }: TrackRowProps) {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;

  const handlePlay = () => {
    playTrack(track, queue);
  };

  return (
    <TouchableOpacity
      onPress={handlePlay}
      className={`flex-row items-center px-4 py-3 ${isActive ? 'bg-morlo-accent/10' : ''}`}
      activeOpacity={0.6}
    >
      {index !== undefined && (
        <Text
          className={`w-8 text-center text-sm font-medium ${isActive ? 'text-morlo-accent' : 'text-morlo-muted'}`}
        >
          {isActive && isPlaying ? '▶' : index + 1}
        </Text>
      )}

      <View className="w-12 h-12 rounded-lg overflow-hidden bg-morlo-card mr-3">
        {track.coverArt ? (
          <Image
            source={{ uri: track.coverArt }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-morlo-surface">
            <Text className="text-lg">🎵</Text>
          </View>
        )}
      </View>

      <View className="flex-1 mr-3">
        <Text
          className={`text-sm font-semibold ${isActive ? 'text-morlo-accent' : 'text-morlo-text'}`}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        {showAgent && (
          <TouchableOpacity onPress={() => router.push(`/agent/${track.agent.slug}`)}>
            <Text className="text-morlo-muted text-xs mt-0.5" numberOfLines={1}>
              {track.agent.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-morlo-muted text-xs mr-3">{formatDuration(track.duration)}</Text>
    </TouchableOpacity>
  );
}
