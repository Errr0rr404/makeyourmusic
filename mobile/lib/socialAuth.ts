import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { getFirebaseAuth, googleOAuthClientIds } from './firebase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Public hook for Google sign-in. Returns request, response, and a `signIn` trigger.
 * Wrap component usage with this; expo-auth-session needs hook lifecycle.
 */
export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: googleOAuthClientIds.ios,
    androidClientId: googleOAuthClientIds.android,
    webClientId: googleOAuthClientIds.web,
  });

  return { request, response, promptAsync };
}

/**
 * Exchange a Google id_token from expo-auth-session for a Firebase ID token.
 */
export async function googleIdTokenToFirebaseIdToken(googleIdToken: string): Promise<string> {
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  return result.user.getIdToken();
}

/**
 * Trigger native Apple Sign-In on iOS. Returns Firebase ID token.
 * Throws on Android or unsupported devices.
 */
export async function signInWithAppleNative(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS in this build.');
  }

  // Apple requires a nonce that's hashed before being sent and verified raw.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const appleResult = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleResult.identityToken) {
    throw new Error('Apple Sign-In returned no identity token.');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleResult.identityToken,
    rawNonce,
  });
  const fbResult = await signInWithCredential(getFirebaseAuth(), credential);
  return fbResult.user.getIdToken();
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
