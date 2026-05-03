import '../global.css';
import '../lib/ignoreDevWarnings';
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { ThemeProvider, useTokens } from '../lib/theme';
import { vars } from 'nativewind';

// Initialize shared services before anything else
bootstrap();

// Sentry — gated on EXPO_PUBLIC_SENTRY_DSN; no-op when the SDK isn't
// installed or the DSN is missing. Lives in module scope so the first
// uncaught exception is captured even if it fires before the React tree mounts.
import { initSentry } from '../lib/sentry';
initSentry();

// Register the playback service (must be at module scope)
TrackPlayer.registerPlaybackService(() => require('../services/trackPlayerService').PlaybackService);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutInner() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthStore();
  // Read store actions via getState() inside the boot effect rather than
  // capturing them in destructuring — zustand actions are stable in
  // practice, but reading on demand removes any chance of a stale closure
  // if zustand internals ever change.
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const hydratePlayerPrefs = usePlayerStore((s) => s.hydratePrefs);
  const playerReady = useRef(false);
  const [booted, setBooted] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Setup player, auth, and push notifications on boot
  useEffect(() => {
    let cleanupPlayer: (() => void) | undefined;
    let cleanupNotifications: (() => void) | undefined;
    // Track whether the cleanup ran before the async setup finished. Without
    // this, Fast Refresh remounts could leak listeners: the cleanup function
    // executed (capturing undefined handles), then the IIFE finished and
    // assigned subscription handles to the dead closure — those listeners
    // were never removed. Now if `unmounted` flips before we finish setup,
    // we run the partial cleanup ourselves at the end of each await step.
    let unmounted = false;

    (async () => {
      // Run auth hydration, onboarding check, and download cache load in parallel
      const [seen] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        hydrate(),
        hydratePlayerPrefs(),
        hydrateDownloadCache().catch(() => undefined),
      ]);
      if (unmounted) return;
      await fetchUser();
      if (unmounted) return;

      setNeedsOnboarding(!seen);
      setBooted(true);

      // Audio player
      const ready = await setupPlayer();
      if (unmounted) return;
      if (ready) {
        playerReady.current = true;
        cleanupPlayer = setupNativePlayerListeners();
        if (unmounted) {
          cleanupPlayer();
          cleanupPlayer = undefined;
          return;
        }
      }

      // Push notifications
      await registerForPushNotifications();
      if (unmounted) {
        cleanupPlayer?.();
        cleanupPlayer = undefined;
        return;
      }
      cleanupNotifications = setupNotificationListeners((data) => {
        // Navigate on notification tap. Notification payloads are
        // server-controlled, but we still validate before navigation so a
        // compromised push or a misconfigured campaign can't drop arbitrary
        // routes (or worse, weird strings interpreted as routes by expo-
        // router).
        const isSafeSlug = (s: unknown): s is string =>
          typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/i.test(s);

        if (data?.url) {
          const route = parseDeepLink(data.url);
          if (route) router.push(route as Parameters<typeof router.push>[0]);
        } else if (isSafeSlug(data?.trackSlug)) {
          router.push(`/track/${data.trackSlug}`);
        } else if (isSafeSlug(data?.agentSlug)) {
          router.push(`/agent/${data.agentSlug}`);
        }
      });
      if (unmounted) {
        cleanupNotifications?.();
        cleanupNotifications = undefined;
        cleanupPlayer?.();
        cleanupPlayer = undefined;
      }
    })();

    return () => {
      unmounted = true;
      cleanupPlayer?.();
      cleanupNotifications?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const { currentTrack, queue, isPlaying, repeat, seekRequest } = usePlayerStore();
  const sync = useSyncPlayerToNative();
  // Stash sync in a ref so syncQueue effect doesn't depend on a fresh
  // object identity each render (§ML-4) and so cleanup can no-op late
  // returns from the previous run.
  const syncRef = useRef(sync);
  syncRef.current = sync;

  // Sync queue when it changes
  const prevQueueRef = useRef<string>('');
  useEffect(() => {
    let cancelled = false;
    const queueKey = queue.map((t) => t.id).join(',') + ':' + (currentTrack?.id || '');
    if (queueKey !== prevQueueRef.current && playerReady.current) {
      prevQueueRef.current = queueKey;
      const promise = syncRef.current.syncQueue();
      // Best-effort: swallow any post-unmount rejection rather than letting
      // it bubble as an unhandled promise.
      Promise.resolve(promise).catch(() => undefined).finally(() => {
        void cancelled;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [queue, currentTrack?.id]);

  // Sync play state
  useEffect(() => {
    if (playerReady.current) {
      Promise.resolve(syncRef.current.syncPlayState()).catch(() => undefined);
    }
  }, [isPlaying]);

  // Sync explicit seek requests. Passive progress updates from native audio
  // use setProgress and intentionally do not trigger this effect.
  useEffect(() => {
    if (playerReady.current && seekRequest) {
      sync.syncSeek(seekRequest.position);
    }
  }, [seekRequest?.id]);

  // Sync repeat mode
  useEffect(() => {
    if (playerReady.current) {
      sync.syncRepeatMode();
    }
  }, [repeat]);

  const tokens = useTokens();

  // NativeWind CSS variables — `bg-mym-*` and friends resolve to whichever
  // skin/palette is active.
  const themeVars = vars({
    '--mym-bg': tokens.bg,
    '--mym-surface': tokens.surface,
    '--mym-card': tokens.card,
    '--mym-border': tokens.border,
    '--mym-accent': tokens.accent,
    '--mym-accent-hover': tokens.brandStrong,
    '--mym-muted': tokens.textMute,
    '--mym-text': tokens.text,
  });

  if (isLoading || !booted) {
    return (
      <View style={[{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }, themeVars]}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[{ flex: 1, backgroundColor: tokens.bg }, themeVars]}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: tokens.bg },
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
        <StatusBar style={tokens.isDark ? 'light' : 'dark'} />
      </View>
    </GestureHandlerRootView>
  );
}
