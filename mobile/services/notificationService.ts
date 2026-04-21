import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApi } from '@morlo/shared';

const PUSH_TOKEN_KEY = 'morlo-push-token';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Sends the token to the backend for server-side push.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
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
    console.log('Push notification permission not granted');
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

  // Get push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  // Register token with backend (best-effort; don't break launch if the user
  // isn't logged in or the network is down)
  try {
    const api = getApi();
    await api.post('/notifications/register-token', {
      token: token.data,
      platform: Platform.OS,
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
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
  const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!cached) return;
  try {
    await getApi().post('/notifications/unregister-token', { token: cached });
  } catch {
    // Silent — the token record will get overwritten when the next user logs in
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

/**
 * Listen for notification taps and return cleanup function.
 */
export function setupNotificationListeners(
  onNotificationTap: (data: any) => void,
): () => void {
  // When user taps a notification
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      onNotificationTap(data);
    },
  );

  return () => subscription.remove();
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
