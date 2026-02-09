'use client';

// Re-export the shared auth store so existing imports keep working.
// The shared store uses the platform-agnostic StorageAdapter + getApi().
// On web the WebStorageAdapter (localStorage) is the default, so no
// extra configuration is needed.
export { useAuthStore } from '@morlo/shared';
export type { User } from '@morlo/shared';
