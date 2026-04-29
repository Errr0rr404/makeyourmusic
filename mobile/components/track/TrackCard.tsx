import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore, formatDuration } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';

interface TrackCardProps {
  track: TrackItem;
  queue?: TrackItem[];
  size?: 'sm' | 'md';
}

export function TrackCard({ track, queue, size = 'md' }: TrackCardProps) {
  const router = useRouter();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const cardWidth = size === 'sm' ? 'w-36' : 'w-44';
  const imageSize = size === 'sm' ? 'h-36' : 'h-44';

  const handlePlay = () => {
    playTrack(track, queue);
  };

  return (
    <TouchableOpacity
      className={`${cardWidth} mr-3`}
      onPress={() => router.push(`/track/${track.slug}`)}
      activeOpacity={0.7}
    >
      <View className={`${imageSize} ${cardWidth} rounded-xl overflow-hidden bg-mym-card mb-2 relative`}>
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
          <View className="flex-1 items-center justify-center bg-mym-surface">
            <Text className="text-3xl">🎵</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handlePlay}
          className="absolute bottom-2 right-2 bg-mym-accent rounded-full w-9 h-9 items-center justify-center"
          activeOpacity={0.8}
          accessibilityLabel={`Play ${track.title}`}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Play size={16} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </View>
      <Text className="text-mym-text text-sm font-semibold" numberOfLines={1}>
        {track.title}
      </Text>
      <Text className="text-mym-muted text-xs mt-0.5" numberOfLines={1}>
        {track.agent.name} · {formatDuration(track.duration)}
      </Text>
    </TouchableOpacity>
  );
}
