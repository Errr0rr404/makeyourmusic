import * as SecureStore from 'expo-secure-store';
import type { StorageAdapter } from '@makeyourmusic/shared';

/**
 * Expo SecureStore adapter for the shared StorageAdapter interface.
 * Stores tokens and sensitive data in the device's secure storage
 * (Keychain on iOS, EncryptedSharedPreferences on Android).
 */
export class SecureStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
}
