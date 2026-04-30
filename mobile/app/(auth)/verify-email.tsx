import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { asToken } from '../../lib/validateSlug';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const rawToken = useLocalSearchParams<{ token?: string }>().token;
  const token = asToken(rawToken);
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
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {status === 'loading' && (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color={tokens.brand} />
            <Text style={{ color: tokens.textMute, marginTop: 16 }}>Verifying your email…</Text>
          </View>
        )}

        {status === 'success' && (
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                backgroundColor: 'rgba(74, 222, 128, 0.12)',
                borderColor: 'rgba(74, 222, 128, 0.3)',
                borderWidth: 1,
                borderRadius: tokens.radiusLg,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <CheckCircle2 size={20} color="#4ade80" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#4ade80', fontWeight: '600', marginBottom: 4 }}>Email verified</Text>
                <Text style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 13 }}>{message}</Text>
              </View>
            </View>
            <Button title="Continue to MakeYourMusic" onPress={() => router.replace('/(tabs)')} size="lg" />
          </View>
        )}

        {status === 'error' && (
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                backgroundColor: 'rgba(248, 113, 113, 0.16)',
                borderColor: 'rgba(248, 113, 113, 0.3)',
                borderWidth: 1,
                borderRadius: tokens.radiusLg,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <AlertCircle size={20} color="#f87171" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#f87171', fontWeight: '600', marginBottom: 4 }}>Verification failed</Text>
                <Text style={{ color: 'rgba(248, 113, 113, 0.8)', fontSize: 13 }}>{message}</Text>
              </View>
            </View>
            <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              The link may be expired. Request a new one below.
            </Text>
            <ResendBlock
              user={user}
              resendEmail={resendEmail}
              setResendEmail={setResendEmail}
              resending={resending}
              resent={resent}
              onResend={handleResend}
              tokens={tokens}
            />
          </View>
        )}

        {status === 'pending' && (
          <View>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: tokens.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Mail size={28} color={tokens.brand} />
              </View>
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 24,
                  fontWeight: '700',
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                }}
              >
                Check your inbox
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
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
              tokens={tokens}
            />
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={{ alignItems: 'center', marginTop: 24 }}
              accessibilityRole="button"
            >
              <Text style={{ color: tokens.textMute, fontSize: 13 }}>
                Skip for now and explore MakeYourMusic →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function ResendBlock({
  user, resendEmail, setResendEmail, resending, resent, onResend, tokens,
}: {
  user: any;
  resendEmail: string;
  setResendEmail: (v: string) => void;
  resending: boolean;
  resent: boolean;
  onResend: () => void;
  tokens: ReturnType<typeof useTokens>;
}) {
  if (resent) {
    return (
      <View
        style={{
          backgroundColor: 'rgba(74, 222, 128, 0.12)',
          borderColor: 'rgba(74, 222, 128, 0.3)',
          borderWidth: 1,
          borderRadius: tokens.radiusLg,
          padding: 16,
        }}
      >
        <Text style={{ color: '#4ade80', fontSize: 13, textAlign: 'center' }}>
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
