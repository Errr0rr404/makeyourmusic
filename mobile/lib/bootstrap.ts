import Constants from 'expo-constants';
import { setStorageAdapter, createApi } from '@makeyourmusic/shared';
import { SecureStorageAdapter } from './secureStorage';
import { loadLocale } from './i18n';

const PROD_API_URL = 'https://morlo-api-production.up.railway.app/api';
const DEV_BACKEND_PORT = 3001;

/**
 * Resolve the API base URL.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL env var (explicit override for any environment)
 *  2. In __DEV__: derive from Expo's hostUri so real devices on the same LAN
 *     can reach the dev backend without any manual config. The Expo dev
 *     server exposes the host machine's LAN IP in `hostUri` (e.g.
 *     "192.168.1.100:8081"); we reuse that IP but swap in the backend port.
 *  3. Production fallback.
 */
function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
    const host = hostUri?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${DEV_BACKEND_PORT}/api`;
    }
    // Simulator / emulator fall back to localhost since they share the host.
    return `http://localhost:${DEV_BACKEND_PORT}/api`;
  }

  return PROD_API_URL;
}

let booted = false;

/**
 * Call once in the root layout to initialize shared services.
 */
export function bootstrap() {
  if (booted) return;
  booted = true;

  // 1. Plug in secure storage for tokens
  setStorageAdapter(new SecureStorageAdapter());

  // 2. Create the API client
  createApi(resolveApiUrl());

  // 3. Warm up the i18n cache. t() works synchronously after this resolves;
  // calls before resolution fall back to English (acceptable for one paint).
  void loadLocale();
}
