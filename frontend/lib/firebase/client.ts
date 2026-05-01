'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  // After HMR, our cached `app` may have been GC'd by Firebase (rebuild
  // resets module-level state in the SDK). Always cross-check against the
  // SDK's own getApps() list and refresh the cache when it diverges.
  const live = getApps()[0];
  if (app && live && app === live) return app;
  if (live) {
    app = live;
    return app;
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
