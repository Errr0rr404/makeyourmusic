import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import { bootstrap } from '../lib/bootstrap';
import { useAuthStore, usePlayerStore } from '@morlo/shared';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { setupPlayer, setupNativePlayerListeners, useSyncPlayerToNative } from '../services/audioService';
import { registerForPushNotifications, setupNotificationListeners } from '../services/notificationService';
import { parseDeepLink } from '../lib/linking';

// Initialize shared services before anything else
bootstrap();

// Register the playback service (must be at module scope)
TrackPlayer.registerPlaybackService(() => require('../services/trackPlayerService').PlaybackService);

export default function RootLayout() {
  const router = useRouter();
  const { isLoading, hydrate, fetchUser, isAuthenticated } = useAuthStore();
  const playerReady = useRef(false);

  // Setup player, auth, and push notifications on boot
  useEffect(() => {
    let cleanupPlayer: (() => void) | undefined;
    let cleanupNotifications: (() => void) | undefined;

    (async () => {
      await hydrate();
      await fetchUser();

      // Audio player
      const ready = await setupPlayer();
      if (ready) {
        playerReady.current = true;
        cleanupPlayer = setupNativePlayerListeners();
      }

      // Push notifications
      await registerForPushNotifications();
      cleanupNotifications = setupNotificationListeners((data) => {
        // Navigate on notification tap
        if (data?.url) {
          const route = parseDeepLink(data.url);
          if (route) router.push(route as any);
        } else if (data?.trackSlug) {
          router.push(`/track/${data.trackSlug}`);
        } else if (data?.agentSlug) {
          router.push(`/agent/${data.agentSlug}`);
        }
      });
    })();

    return () => {
      cleanupPlayer?.();
      cleanupNotifications?.();
    };
  }, []);

  // Sync Zustand -> native player
  const { currentTrack, queue, isPlaying, repeat } = usePlayerStore();
  const sync = useSyncPlayerToNative();

  // Sync queue when it changes
  const prevQueueRef = useRef<string>('');
  useEffect(() => {
    const queueKey = queue.map((t) => t.id).join(',') + ':' + (currentTrack?.id || '');
    if (queueKey !== prevQueueRef.current && playerReady.current) {
      prevQueueRef.current = queueKey;
      sync.syncQueue();
    }
  }, [queue, currentTrack?.id]);

  // Sync play state
  useEffect(() => {
    if (playerReady.current) {
      sync.syncPlayState();
    }
  }, [isPlaying]);

  // Sync repeat mode
  useEffect(() => {
    if (playerReady.current) {
      sync.syncRepeatMode();
    }
  }, [repeat]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-morlo-bg">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
          <Stack.Screen name="track/[slug]" />
          <Stack.Screen name="agent/[slug]" />
          <Stack.Screen name="genre/[slug]" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen
            name="player"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
        </Stack>
        <MiniPlayer />
        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}
