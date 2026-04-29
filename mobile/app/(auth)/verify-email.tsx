import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user, fetchUser } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>(
    token ? 'loading' : 'pending'
  );
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await getApi().get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified');
        fetchUser().catch(() => {});
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Invalid or expired verification token');
      }
    })();
  }, [token, fetchUser]);

  const handleResend = async () => {
    const emailToUse = user?.email || resendEmail;
    if (!emailToUse) return;
    setResending(true);
    try {
      await getApi().post('/auth/resend-verification', { email: emailToUse });
      setResent(true);
    } catch {
      setResent(true); // match backend privacy model
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <View className="flex-1 justify-center px-6">
        {status === 'loading' && (
          <View className="items-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="text-mym-muted mt-4">Verifying your email…</Text>
          </View>
        )}

        {status === 'success' && (
          <View>
            <View className="flex-row items-start gap-3 bg-green-900/30 border border-green-500/30 rounded-xl p-4 mb-6">
              <CheckCircle2 size={20} color="#4ade80" />
              <View className="flex-1">
                <Text className="text-green-400 font-semibold mb-1">Email verified</Text>
                <Text className="text-green-300/80 text-sm">{message}</Text>
              </View>
            </View>
            <Button title="Continue to MakeYourMusic" onPress={() => router.replace('/(tabs)')} size="lg" />
          </View>
        )}

        {status === 'error' && (
          <View>
            <View className="flex-row items-start gap-3 bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6">
              <AlertCircle size={20} color="#f87171" />
              <View className="flex-1">
                <Text className="text-red-400 font-semibold mb-1">Verification failed</Text>
                <Text className="text-red-300/80 text-sm">{message}</Text>
              </View>
            </View>
            <Text className="text-mym-muted text-sm mb-4 text-center">
              The link may be expired. Request a new one below.
            </Text>
            <ResendBlock
              user={user}
              resendEmail={resendEmail}
              setResendEmail={setResendEmail}
              resending={resending}
              resent={resent}
              onResend={handleResend}
            />
          </View>
        )}

        {status === 'pending' && (
          <View>
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-full bg-mym-accent/10 items-center justify-center mb-4">
                <Mail size={28} color="#8b5cf6" />
              </View>
              <Text className="text-mym-text text-2xl font-bold">Check your inbox</Text>
              <Text className="text-mym-muted text-sm mt-1 text-center">
                {user?.email
                  ? `We sent a verification link to ${user.email}`
                  : 'We sent a verification link to your email'}
              </Text>
            </View>
            <ResendBlock
              user={user}
              resendEmail={resendEmail}
              setResendEmail={setResendEmail}
              resending={resending}
              resent={resent}
              onResend={handleResend}
            />
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              className="items-center mt-6"
            >
              <Text className="text-mym-muted text-sm">Skip for now and explore MakeYourMusic →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function ResendBlock({
  user, resendEmail, setResendEmail, resending, resent, onResend,
}: {
  user: any;
  resendEmail: string;
  setResendEmail: (v: string) => void;
  resending: boolean;
  resent: boolean;
  onResend: () => void;
}) {
  if (resent) {
    return (
      <View className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
        <Text className="text-green-400 text-sm text-center">
          If an unverified account exists with that email, a new verification link has been sent.
        </Text>
      </View>
    );
  }
  return (
    <>
      {!user?.email && (
        <Input
          placeholder="you@example.com"
          value={resendEmail}
          onChangeText={setResendEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      )}
      <Button
        title="Resend verification email"
        onPress={onResend}
        loading={resending}
        variant="secondary"
        size="lg"
      />
    </>
  );
}
