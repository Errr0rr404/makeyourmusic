import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bootstrap } from '../lib/bootstrap';
import { useAuthStore, usePlayerStore } from '@makeyourmusic/shared';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { setupPlayer, setupNativePlayerListeners, useSyncPlayerToNative } from '../services/audioService';
import { registerForPushNotifications, setupNotificationListeners } from '../services/notificationService';
import { hydrateDownloadCache } from '../services/downloadService';
import { parseDeepLink } from '../lib/linking';
import { consumePendingShare } from '../services/sharePayloadService';
import { ONBOARDING_KEY } from './onboarding';

// Initialize shared services before anything else
bootstrap();

// Register the playback service (must be at module scope)
TrackPlayer.registerPlaybackService(() => require('../services/trackPlayerService').PlaybackService);

export default function RootLayout() {
  const router = useRouter();
  const { isLoading, hydrate, fetchUser, isAuthenticated } = useAuthStore();
  const hydratePlayerPrefs = usePlayerStore((s) => s.hydratePrefs);
  const playerReady = useRef(false);
  const [booted, setBooted] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Setup player, auth, and push notifications on boot
  useEffect(() => {
    let cleanupPlayer: (() => void) | undefined;
    let cleanupNotifications: (() => void) | undefined;

    (async () => {
      // Run auth hydration, onboarding check, and download cache load in parallel
      const [seen] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        hydrate(),
        hydratePlayerPrefs(),
        hydrateDownloadCache().catch(() => undefined),
      ]);
      await fetchUser();

      setNeedsOnboarding(!seen);
      setBooted(true);

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
          // parseDeepLink returns a validated runtime path string; typed routes
          // can't narrow a dynamic string, so a cast here is intentional.
          if (route) router.push(route as Parameters<typeof router.push>[0]);
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

  // Once booted, if user hasn't seen onboarding, route to it AFTER Stack is mounted
  useEffect(() => {
    if (booted && needsOnboarding) {
      // Small delay so the Stack finishes initial render before we navigate
      const t = setTimeout(() => router.replace('/onboarding'), 0);
      return () => clearTimeout(t);
    }
  }, [booted, needsOnboarding, router]);

  // Pick up payloads dropped by the iOS Share Extension. Runs once after
  // boot. The native module returns null until the share-extension config
  // plugin is enabled and the app is rebuilt with EAS — so this is a no-op
  // on Android and on builds that haven't been prebuilt with the plugin.
  useEffect(() => {
    if (!booted || needsOnboarding) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await consumePendingShare();
        if (cancelled || !payload) return;
        // Navigate to the create page and pass the share text as the prompt
        // seed. URLs and image paths are also forwarded — the create page
        // can decide how to surface them (e.g. show a thumbnail preview).
        const params = new URLSearchParams();
        if (payload.text) params.set('prompt', payload.text);
        if (payload.urls.length) params.set('urls', payload.urls.join(','));
        if (payload.imagePaths.length) params.set('images', payload.imagePaths.join(','));
        const qs = params.toString();
        router.push(`/create${qs ? `?${qs}` : ''}` as any);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booted, needsOnboarding, router]);

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

  if (isLoading || !booted) {
    return (
      <View className="flex-1 bg-mym-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-mym-bg">
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
          <Stack.Screen name="playlist/[slug]" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="profile/index" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="notifications/index" />
          <Stack.Screen name="create/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="studio/generations" />
          <Stack.Screen name="studio/video" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
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
