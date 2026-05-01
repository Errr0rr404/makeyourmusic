import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await getApi().post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
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
                marginBottom: 4,
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                textTransform: isVintage ? 'uppercase' : undefined,
              }}
            >
              Reset your password
            </Text>
            <Text style={{ color: tokens.textMute, fontSize: 13, textAlign: 'center' }}>
              We'll send you a link to create a new password
            </Text>
          </View>

          {submitted ? (
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
                  <Text style={{ color: '#4ade80', fontWeight: '600', marginBottom: 4 }}>Check your inbox</Text>
                  <Text style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 13 }}>
                    If an account with that email exists, we've sent a reset link. It expires in 1 hour.
                  </Text>
                </View>
              </View>
              <Button title="Back to Log In" onPress={() => router.replace('/(auth)/login')} size="lg" />
            </View>
          ) : (
            <>
              {error ? (
                <View
                  style={{
                    backgroundColor: 'rgba(248, 113, 113, 0.16)',
                    borderColor: 'rgba(248, 113, 113, 0.5)',
                    borderWidth: 1,
                    borderRadius: tokens.radiusLg,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Button title="Send reset link" onPress={handleSubmit} loading={loading} size="lg" />

              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                style={{ alignItems: 'center', marginTop: 24 }}
                accessibilityRole="button"
              >
                <Text style={{ color: tokens.textMute, fontSize: 13 }}>
                  Remembered your password? <Text style={{ color: tokens.accent, fontWeight: '600' }}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
