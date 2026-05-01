import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApi } from '@makeyourmusic/shared';

const PUSH_TOKEN_KEY = 'makeyourmusic-push-token';

// Push tokens identify the device — not strictly secret, but worth keeping
// out of AsyncStorage. Use SecureStore where available, fall back to
// AsyncStorage for environments without it.
async function setStoredPushToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  }
}
async function getStoredPushToken(): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (v) return v;
  } catch {
    /* fall through */
  }
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
async function removeStoredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => undefined);
}

// Configure how notifications appear when the app is in the foreground.
// `shouldShowAlert` is deprecated in Expo SDK 54+ — `shouldShowBanner` and
// `shouldShowList` are the replacements. Don't pass both.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

/**
 * Register for push notifications and return the Expo push token.
 * Sends the token to the backend for server-side push.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('Push notification permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b5cf6',
    });

    await Notifications.setNotificationChannelAsync('new-music', {
      name: 'New Music',
      description: 'Notifications about new tracks from agents you follow',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Get push token. Expo push tokens require a configured EAS projectId —
  // in Expo Go or a dev build without EAS setup, skip silently so the app
  // keeps booting. Push is an enhancement, not a launch dependency.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  if (!projectId) {
    if (__DEV__) console.log('Push notifications skipped — no EAS projectId configured');
    return null;
  }

  let token: Awaited<ReturnType<typeof Notifications.getExpoPushTokenAsync>>;
  try {
    token = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (err) {
    if (__DEV__) console.log('Failed to get Expo push token:', (err as Error).message);
    return null;
  }

  // Register token with backend (best-effort; don't break launch if the user
  // isn't logged in or the network is down)
  try {
    const api = getApi();
    await api.post('/notifications/register-token', {
      token: token.data,
      platform: Platform.OS,
    });
    await setStoredPushToken(token.data);
  } catch {
    // Silent — will retry on next launch or login
  }

  return token.data;
}

/**
 * Tell the backend to forget this device's push token. Call on logout so the
 * user doesn't keep receiving pushes for the previous account on this device.
 */
export async function unregisterPushToken(): Promise<void> {
  const cached = await getStoredPushToken();
  if (!cached) return;
  try {
    await getApi().post('/notifications/unregister-token', { token: cached });
  } catch {
    // Silent — the token record will get overwritten when the next user logs in
  } finally {
    await removeStoredPushToken();
  }
}

/**
 * Listen for notification taps and return cleanup function.
 */
export function setupNotificationListeners(
  onNotificationTap: (data: any) => void,
  onForegroundNotification?: (data: any) => void,
): () => void {
  // Tap (background → foreground) handler.
  const tapSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      onNotificationTap(data);
    },
  );
  // Foreground delivery — without this, the unread-badge / in-app banner only
  // updated when a screen happened to focus and re-poll. Optional: when no
  // handler is provided, skip the foreground listener entirely.
  let foregroundSub: { remove: () => void } | null = null;
  if (onForegroundNotification) {
    foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      onForegroundNotification(notification.request.content.data);
    });
  }

  return () => {
    tapSub.remove();
    foregroundSub?.remove();
  };
}

/**
 * Schedule a local notification (for testing / offline use).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}
