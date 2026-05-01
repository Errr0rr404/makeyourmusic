import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import logger from './logger';

let initialized = false;

function loadCredentials(): admin.ServiceAccount | null {
  // 1. JSON blob in env (Railway / production)
  const jsonBlob = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonBlob) {
    try {
      return JSON.parse(jsonBlob) as admin.ServiceAccount;
    } catch (err) {
      logger.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON', {
        error: (err as Error).message,
      });
      return null;
    }
  }

  // 2. Local file fallback (dev). Try common locations — `__dirname` differs
  // between `dist/utils` and `src/utils` builds, so anchor to process.cwd()
  // and walk up a couple levels.
  const candidates = [
    path.resolve(process.cwd(), 'firebase-service-account.json'),
    path.resolve(process.cwd(), 'backend/firebase-service-account.json'),
    path.resolve(__dirname, '../../firebase-service-account.json'),
    path.resolve(__dirname, '../../../firebase-service-account.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return JSON.parse(fs.readFileSync(candidate, 'utf8')) as admin.ServiceAccount;
      } catch (err) {
        logger.error('Failed to read firebase-service-account.json', {
          path: candidate,
          error: (err as Error).message,
        });
        return null;
      }
    }
  }

  return null;
}

export function initFirebaseAdmin(): admin.app.App | null {
  if (initialized) return admin.app();

  const credentials = loadCredentials();
  if (!credentials) {
    logger.warn('Firebase admin not initialized: no service account credentials found');
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: (credentials as { project_id?: string }).project_id || 'makeyourmusic',
  });

  initialized = true;
  logger.info('Firebase admin initialized', {
    projectId: (credentials as { project_id?: string }).project_id,
  });
  return admin.app();
}

export interface FirebaseUserClaims {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  provider: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseUserClaims> {
  const app = initFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase admin not configured');
  }

  const decoded = await admin.auth().verifyIdToken(idToken, true);
  // Defensive max-age check: Firebase ID tokens are valid for 1 hour. We
  // require iat within the last 1h + small skew so an old token that somehow
  // slipped past Google's checks is still rejected app-side.
  const nowSec = Math.floor(Date.now() / 1000);
  const tokenAgeSec = nowSec - (decoded.iat || 0);
  if (tokenAgeSec > 3600 + 300) {
    throw new Error('Firebase ID token is too old');
  }
  const provider = decoded.firebase?.sign_in_provider || 'unknown';

  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified,
    name: decoded.name,
    picture: decoded.picture,
    provider,
  };
}
