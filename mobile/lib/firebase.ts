import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error -- getReactNativePersistence is not in firebase/auth's
  // public type definitions but is a documented runtime export. See:
  // https://firebase.google.com/docs/auth/web/start#sign-in-and-sign-up
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same project as web. Public client values — safe to ship in the bundle.
const firebaseConfig = {
  apiKey: 'AIzaSyAH-P0R6THdXTTSGGVhjiUdhrYN-Sc9j-g',
  authDomain: 'makeyourmusic.firebaseapp.com',
  projectId: 'makeyourmusic',
  storageBucket: 'makeyourmusic.firebasestorage.app',
  messagingSenderId: '709709352560',
  appId: '1:709709352560:ios:9587311153d7c2bbd9aeb5',
} as const;

// Google OAuth client IDs (per platform). Used by expo-auth-session.
export const googleOAuthClientIds = {
  ios: '709709352560-d0j1r8144tp9b3861619sm3q0knd892i.apps.googleusercontent.com',
  // Android client ID gets created when SHA-1 is registered with Firebase.
  // Until then, the iOS client works for both — Google Sign-In falls back via expo-auth-session.
  android: '709709352560-d0j1r8144tp9b3861619sm3q0knd892i.apps.googleusercontent.com',
  web: '709709352560-24ob9dk5lnuuml9qa09q8rnkqr3pr4nn.apps.googleusercontent.com',
} as const;

let app: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const fbApp = getFirebaseApp();
  // initializeAuth must be called BEFORE the first getAuth() to register the
  // RN-AsyncStorage persistence layer. Without persistence, Firebase Auth
  // state evaporates on every cold start and offline `getIdToken()` fails.
  // Calling initializeAuth twice on the same app throws — wrap in try/catch
  // and fall back to getAuth() on the second hit (e.g. Fast Refresh).
  try {
    cachedAuth = initializeAuth(fbApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    cachedAuth = getAuth(fbApp);
  }
  return cachedAuth;
}
