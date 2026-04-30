import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
