import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { usePlayerStore, useAuthStore, getApi, formatDuration } from '@makeyourmusic/shared';
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
  SlidersHorizontal,
} from 'lucide-react-native';
import TrackPlayer from 'react-native-track-player';
import Slider from '../components/ui/Slider';
import { SwipeableDismiss } from '../components/ui/SwipeableDismiss';
import { hapticLight } from '../services/hapticService';
import { createTrackShareLink } from '../lib/linking';
import PlayerSettingsModal from '../components/player/PlayerSettings';

export default function FullScreenPlayer() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const {
    currentTrack,
    queue,
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
    playbackSpeed,
    eqEnabled,
    sleepTimerEnd,
  } = usePlayerStore();

  // Reset/refresh liked state when the active track changes.
  useEffect(() => {
    setLiked(Boolean((currentTrack as any)?.isLiked));
    if (!currentTrack || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const api = getApi();
        const res = await api.get(`/tracks/${(currentTrack as any).slug || currentTrack.id}`);
        const fresh = res.data.track || res.data;
        if (!cancelled && fresh?.id === currentTrack.id) {
          setLiked(Boolean(fresh.isLiked));
        }
      } catch {
        // best-effort — fall back to whatever the store already had
      }
    })();
    return () => { cancelled = true; };
  }, [currentTrack?.id, isAuthenticated]);

  const handleLike = async () => {
    if (!currentTrack) return;
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Log in to save tracks to your library.');
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic toggle
    setLiked((prev) => !prev);
    hapticLight();
    try {
      const api = getApi();
      const res = await api.post(`/social/likes/${currentTrack.id}`);
      setLiked(Boolean(res.data?.liked));
    } catch {
      // Roll back on failure
      setLiked((prev) => !prev);
      Alert.alert('Like failed', 'Could not update like. Try again.');
    } finally {
      setLikeBusy(false);
    }
  };

  // Sync playback speed to native player
  useEffect(() => {
    try {
      TrackPlayer.setRate(playbackSpeed);
    } catch {
      // player may not be initialized
    }
  }, [playbackSpeed]);

  // Sleep timer tick
  const { sleepTimer, tickSleepTimer } = usePlayerStore();
  useEffect(() => {
    if (!sleepTimerEnd) return;
    const interval = setInterval(() => tickSleepTimer(), 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  // Navigate away in an effect — calling router.back() during render causes
  // "Cannot update a component while rendering" warnings and a navigation
  // race when the modal is dismissed concurrently with other navigation.
  useEffect(() => {
    if (!currentTrack) router.back();
  }, [currentTrack]);

  if (!currentTrack) return null;

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
      const url = createTrackShareLink(currentTrack.slug);
      // Prefer the vertical preview video when available — Instagram/TikTok
      // pull it as a rich preview, which converts dramatically better than
      // a plain audio link. Fall back to the canonical track URL.
      const shareUrl = currentTrack.previewVideoUrl || url;
      await Share.share({
        message: `Listen to "${currentTrack.title}" by ${currentTrack.agent.name} on MakeYourMusic — ${url}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  };

  const hasActiveSettings = eqEnabled || playbackSpeed !== 1 || sleepTimerEnd !== null;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  const formatTimerRemaining = () => {
    if (!sleepTimerEnd) return null;
    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SwipeableDismiss onDismiss={() => router.back()}>
      <SafeAreaView className="flex-1 bg-mym-bg">
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ChevronDown size={28} color="#fafafa" />
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-mym-muted text-sm font-medium">Now Playing</Text>
              {playbackSpeed !== 1 && (
                <Text className="text-violet-400 text-[10px] font-semibold mt-0.5">
                  {playbackSpeed}x speed
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                className="p-2"
                accessibilityLabel="Audio settings"
                onPress={() => {
                  setShowSettings(true);
                  hapticLight();
                }}
              >
                <SlidersHorizontal
                  size={20}
                  color={hasActiveSettings ? '#8b5cf6' : '#a1a1aa'}
                />
                {hasActiveSettings && (
                  <View
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2"
                accessibilityLabel="Queue"
                onPress={() => {
                  const queueNames = queue.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
                  Alert.alert('Queue', queueNames || 'Queue is empty');
                }}
              >
                <ListMusic size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cover Art */}
          <View className="flex-1 items-center justify-center">
            <View className="w-72 h-72 rounded-3xl overflow-hidden bg-mym-card shadow-2xl">
              {currentTrack.coverArt ? (
                <Image
                  source={{ uri: currentTrack.coverArt }}
                  style={{ width: 288, height: 288 }}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                  recyclingKey={currentTrack.id}
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-mym-surface">
                  <Text className="text-7xl">🎵</Text>
                </View>
              )}
            </View>
          </View>

          {/* Track Info */}
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-mym-text text-xl font-bold" numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <TouchableOpacity onPress={() => {
                  router.dismiss();
                  router.push(`/agent/${currentTrack.agent.slug}`);
                }}>
                  <Text className="text-mym-accent text-base mt-1" numberOfLines={1}>
                    {currentTrack.agent.name}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                className="p-2"
                onPress={handleLike}
                disabled={likeBusy}
                accessibilityLabel={liked ? 'Unlike track' : 'Like track'}
              >
                <Heart
                  size={22}
                  color={liked ? '#ef4444' : '#a1a1aa'}
                  fill={liked ? '#ef4444' : 'none'}
                />
              </TouchableOpacity>
            </View>

            {/* Sleep Timer Indicator */}
            {sleepTimerEnd && (
              <View className="flex-row items-center gap-1.5 mt-2 bg-violet-500/15 rounded-full self-start px-3 py-1">
                <View className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <Text className="text-violet-400 text-[11px] font-medium">
                  Sleep in {formatTimerRemaining()}
                </Text>
              </View>
            )}

            {/* Progress bar */}
            <View className="mt-5">
              <Slider
                value={progress}
                max={duration || 1}
                onValueChange={setProgress}
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-mym-muted text-xs">
                  {formatDuration(Math.floor(progress))}
                </Text>
                <Text className="text-mym-muted text-xs">
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
                className="bg-mym-accent rounded-full w-16 h-16 items-center justify-center"
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
            <View className="flex-row items-center justify-center mt-6 mb-4 gap-6">
              <TouchableOpacity className="p-3" onPress={handleShare}>
                <Share2 size={20} color="#a1a1aa" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-3"
                onPress={() => {
                  setShowSettings(true);
                  hapticLight();
                }}
              >
                <SlidersHorizontal
                  size={20}
                  color={hasActiveSettings ? '#8b5cf6' : '#a1a1aa'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
      </SwipeableDismiss>

      {/* Settings Modal */}
      <PlayerSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
