// Reads the pending share-extension payload on app launch.
//
// The iOS extension writes share-pending.json into the App Group container.
// We don't have direct access to that container path from JS, so we read it
// via a tiny native module. Until that module is wired (post-prebuild), this
// service safely returns null and the rest of the app works unchanged.
//
// When the native bridge is in, the wiring is:
//   1. Prebuild ships ShareGroupModule (iOS only) that exposes a method
//      `readPendingShare()` returning JSON or null.
//   2. App boot calls consumePendingShare() once and routes to /create.

import { NativeModules, Platform } from 'react-native';

export interface SharePayload {
  text: string;
  urls: string[];
  imagePaths: string[];   // filenames inside the App Group container
  createdAt: string;
}

interface ShareGroupNative {
  readPendingShare(): Promise<string | null>; // JSON-stringified payload
  clearPendingShare(): Promise<void>;
}

function getModule(): ShareGroupNative | null {
  if (Platform.OS !== 'ios') return null;
  const mod = (NativeModules as any).ShareGroupModule as ShareGroupNative | undefined;
  return mod ?? null;
}

export async function consumePendingShare(): Promise<SharePayload | null> {
  const mod = getModule();
  if (!mod) return null;
  try {
    const raw = await mod.readPendingShare();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharePayload>;
    await mod.clearPendingShare();
    return {
      text: parsed.text || '',
      urls: parsed.urls || [],
      imagePaths: parsed.imagePaths || [],
      createdAt: parsed.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
