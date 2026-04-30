import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@makeyourmusic/shared';
import {
  useGoogleSignIn,
  googleIdTokenToFirebaseIdToken,
  signInWithAppleNative,
  isAppleSignInAvailable,
} from '../../lib/socialAuth';

type Pending = 'google' | 'apple' | null;

export function SocialAuthButtons({
  onError,
  onSuccess,
}: {
  onError: (msg: string) => void;
  onSuccess: () => void;
}) {
  const firebaseSignIn = useAuthStore((s) => s.firebaseSignIn);
  const [pending, setPending] = useState<Pending>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { request, response, promptAsync } = useGoogleSignIn();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Handle Google response when it comes back from the browser flow.
  useEffect(() => {
    let cancelled = false;
    const handle = async () => {
      if (response?.type !== 'success') {
        if (response?.type === 'error') {
          onError('Google sign-in failed.');
        }
        if (response) setPending(null);
        return;
      }
      const idToken = response.params.id_token;
      if (!idToken) {
        onError('Google sign-in returned no token.');
        setPending(null);
        return;
      }
      try {
        const fbIdToken = await googleIdTokenToFirebaseIdToken(idToken);
        if (cancelled) return;
        await firebaseSignIn(fbIdToken);
        if (!cancelled) onSuccess();
      } catch (err: any) {
        if (!cancelled) onError(err?.message || 'Google sign-in failed.');
      } finally {
        if (!cancelled) setPending(null);
      }
    };
    handle();
    return () => {
      cancelled = true;
    };
  }, [response]);

  const onGoogle = async () => {
    onError('');
    setPending('google');
    try {
      await promptAsync();
    } catch (err: any) {
      onError(err?.message || 'Google sign-in failed.');
      setPending(null);
    }
  };

  const onApple = async () => {
    onError('');
    setPending('apple');
    try {
      const fbIdToken = await signInWithAppleNative();
      await firebaseSignIn(fbIdToken);
      onSuccess();
    } catch (err: any) {
      const code = err?.code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        onError(err?.message || 'Apple sign-in failed.');
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <View className="space-y-3 mb-4">
      <TouchableOpacity
        onPress={onGoogle}
        disabled={!request || pending !== null}
        className="h-12 rounded-xl bg-white flex-row items-center justify-center"
      >
        {pending === 'google' ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black font-semibold text-base">Continue with Google</Text>
        )}
      </TouchableOpacity>

      {appleAvailable && Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={12}
          style={{ height: 48 }}
          onPress={onApple}
        />
      )}
    </View>
  );
}
