import { setStorageAdapter, createApi } from '@morlo/shared';
import { SecureStorageAdapter } from './secureStorage';

// API base URL — use env var if available, otherwise defaults
const API_URL = process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? 'http://localhost:3001/api' : 'https://morlo-production.up.railway.app/api');

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
  createApi(API_URL);
}
