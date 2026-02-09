/**
 * Platform-agnostic storage adapter interface.
 * Web uses localStorage, mobile uses expo-secure-store.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Web localStorage adapter (synchronous localStorage wrapped in async interface)
 */
export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}

// Singleton — set by platform on boot
let _storage: StorageAdapter = new WebStorageAdapter();

export function setStorageAdapter(adapter: StorageAdapter) {
  _storage = adapter;
}

export function getStorage(): StorageAdapter {
  return _storage;
}
