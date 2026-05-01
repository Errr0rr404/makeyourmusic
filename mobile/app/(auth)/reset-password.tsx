import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { asToken } from '../../lib/validateSlug';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const rawToken = useLocalSearchParams<{ token?: string }>().token;
  const token = asToken(rawToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Use the link from your email.');
    }
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [token]);

  const validate = (): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must include a number';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await getApi().post('/auth/reset-password', { token, password });
      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => router.replace('/(auth)/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={tokens.textMute} />
          <Text style={{ color: tokens.textMute, marginLeft: 8 }}>Back</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text
            style={{
              color: tokens.text,
              fontSize: 22,
              fontWeight: '700',
              marginBottom: 8,
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : undefined,
            }}
          >
            Choose a new password
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 24 }}>
            At least 8 characters with an uppercase letter, lowercase letter, and number.
          </Text>

          {success ? (
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
              }}
            >
              <CheckCircle2 size={20} color="#4ade80" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#4ade80', fontWeight: '600', marginBottom: 4 }}>Password updated</Text>
                <Text style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 13 }}>Redirecting to login…</Text>
              </View>
            </View>
          ) : (
            <>
              {error ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                    backgroundColor: 'rgba(248, 113, 113, 0.16)',
                    borderColor: 'rgba(248, 113, 113, 0.5)',
                    borderWidth: 1,
                    borderRadius: tokens.radiusLg,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={16} color="#f87171" />
                  <Text style={{ color: '#f87171', fontSize: 13, flex: 1 }}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="New password"
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!!token}
              />
              <Input
                label="Confirm password"
                placeholder="Re-enter password"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                editable={!!token}
              />

              <Button
                title="Reset password"
                onPress={handleSubmit}
                loading={loading}
                disabled={!token}
                size="lg"
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
