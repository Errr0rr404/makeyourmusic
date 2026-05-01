/**
 * Platform-agnostic storage adapter interface.
 * Web uses localStorage, mobile uses expo-secure-store.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function hasLocalStorage(): boolean {
  // `typeof window === 'undefined'` is not enough — Safari private mode and
  // sandboxed iframes throw on access to `localStorage` even when `window`
  // exists.
  try {
    return typeof globalThis !== 'undefined' && typeof (globalThis as { localStorage?: Storage }).localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Web localStorage adapter (synchronous localStorage wrapped in async interface)
 */
export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (!hasLocalStorage()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!hasLocalStorage()) {
      // Calling setItem on the web adapter from Node/SSR/test context used to
      // silently no-op, which made `setAuth` lose tokens written from
      // isomorphic code. Fail loud so callers install MemoryStorageAdapter
      // (or an equivalent) for non-browser environments.
      throw new Error(
        'WebStorageAdapter.setItem called in a non-browser environment. ' +
          'Install a server-side adapter via setStorageAdapter() (e.g. MemoryStorageAdapter).',
      );
    }
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Storage setItem failed (quota exceeded?):', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!hasLocalStorage()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // silently ignore
    }
  }
}

/**
 * In-memory adapter — useful for SSR, tests, and any environment without
 * localStorage. Drop-in replacement for `WebStorageAdapter`.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Singleton — set by platform on boot. Defaults to in-memory in non-browser
// environments so SSR / tests don't crash on the web adapter's loud throw.
let _storage: StorageAdapter = hasLocalStorage()
  ? new WebStorageAdapter()
  : new MemoryStorageAdapter();

export function setStorageAdapter(adapter: StorageAdapter) {
  _storage = adapter;
}

export function getStorage(): StorageAdapter {
  return _storage;
}
