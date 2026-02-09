import { View, Text, TouchableOpacity, Share } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { usePlayerStore, formatDuration } from '@morlo/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Share2,
  ListMusic,
} from 'lucide-react-native';
import Slider from '../components/ui/Slider';
import { SwipeableDismiss } from '../components/ui/SwipeableDismiss';
import { hapticLight } from '../services/hapticService';
import { createTrackShareLink } from '../lib/linking';

export default function FullScreenPlayer() {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    progress,
    duration,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    setProgress,
  } = usePlayerStore();

  if (!currentTrack) {
    router.back();
    return null;
  }

  const handleTogglePlay = () => {
    togglePlay();
    hapticLight();
  };

  const handleNext = () => {
    nextTrack();
    hapticLight();
  };

  const handlePrev = () => {
    prevTrack();
    hapticLight();
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    try {
      await Share.share({
        message: `Listen to "${currentTrack.title}" by ${currentTrack.agent.name} on Morlo.ai`,
        url: createTrackShareLink(currentTrack.slug),
      });
    } catch {
      // user cancelled
    }
  };

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeableDismiss onDismiss={() => router.back()}>
      <SafeAreaView className="flex-1 bg-morlo-bg">
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ChevronDown size={28} color="#fafafa" />
            </TouchableOpacity>
            <Text className="text-morlo-muted text-sm font-medium">Now Playing</Text>
            <TouchableOpacity className="p-2">
              <ListMusic size={22} color="#fafafa" />
            </TouchableOpacity>
          </View>

          {/* Cover Art */}
          <View className="flex-1 items-center justify-center">
            <View className="w-72 h-72 rounded-3xl overflow-hidden bg-morlo-card shadow-2xl">
              {currentTrack.coverArt ? (
                <Image
                  source={{ uri: currentTrack.coverArt }}
                  style={{ width: 288, height: 288 }}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-morlo-surface">
                  <Text className="text-7xl">🎵</Text>
                </View>
              )}
            </View>
          </View>

          {/* Track Info */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-morlo-text text-xl font-bold" numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <TouchableOpacity onPress={() => {
                  router.back();
                  setTimeout(() => router.push(`/agent/${currentTrack.agent.slug}`), 100);
                }}>
                  <Text className="text-morlo-accent text-base mt-1" numberOfLines={1}>
                    {currentTrack.agent.name}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="p-2">
                <Heart size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View className="mt-5">
              <Slider
                value={progress}
                max={duration || 1}
                onValueChange={setProgress}
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-morlo-muted text-xs">
                  {formatDuration(Math.floor(progress))}
                </Text>
                <Text className="text-morlo-muted text-xs">
                  {formatDuration(Math.floor(duration))}
                </Text>
              </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-between mt-6 px-4">
              <TouchableOpacity onPress={toggleShuffle} className="p-3">
                <Shuffle size={20} color={shuffle ? '#8b5cf6' : '#a1a1aa'} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePrev} className="p-3">
                <SkipBack size={28} color="#fafafa" fill="#fafafa" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTogglePlay}
                className="bg-morlo-accent rounded-full w-16 h-16 items-center justify-center"
              >
                {isPlaying ? (
                  <Pause size={28} color="#fff" fill="#fff" />
                ) : (
                  <Play size={28} color="#fff" fill="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleNext} className="p-3">
                <SkipForward size={28} color="#fafafa" fill="#fafafa" />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleRepeat} className="p-3">
                <RepeatIcon
                  size={20}
                  color={repeat !== 'none' ? '#8b5cf6' : '#a1a1aa'}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom actions */}
            <View className="flex-row items-center justify-center mt-6 mb-4">
              <TouchableOpacity className="p-3 mx-4" onPress={handleShare}>
                <Share2 size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
      </SwipeableDismiss>
    </>
  );
}
