import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@makeyourmusic/shared';
import { Check } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleRegister = async () => {
    if (!acceptTerms) {
      setError('Please accept the Terms and Privacy Policy');
      return;
    }
    if (!email.trim() || !username.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, username.trim(), displayName.trim() || undefined);
      router.replace('/(auth)/verify-email');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Logo size={64} />
            <Text
              style={{
                color: tokens.text,
                fontSize: 22,
                fontWeight: '800',
                marginTop: 14,
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                letterSpacing: isVintage ? 1 : -0.5,
                textTransform: isVintage ? 'uppercase' : undefined,
              }}
            >
              MakeYourMusic
            </Text>
            <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }}>AI-Generated Music</Text>
          </View>

          <Text
            style={{
              color: tokens.text,
              fontSize: 22,
              fontWeight: '700',
              marginBottom: 24,
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
            }}
          >
            Create account
          </Text>

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

          <SocialAuthButtons
            onError={setError}
            onSuccess={() => router.replace('/(tabs)')}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
            <Text
              style={{
                color: tokens.textMute,
                fontSize: 11,
                textTransform: 'uppercase',
                marginHorizontal: 12,
                letterSpacing: 1,
              }}
            >
              or with email
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
          </View>

          <Input
            label="Email *"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Username *"
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Display Name"
            placeholder="Your display name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Input
            label="Password *"
            placeholder="8+ chars, 1 upper, 1 lower, 1 number"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={() => setAcceptTerms(!acceptTerms)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, paddingVertical: 8 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptTerms }}
            accessibilityLabel="Accept terms of service and privacy policy"
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
                backgroundColor: acceptTerms ? tokens.brand : tokens.card,
                borderColor: acceptTerms ? tokens.brand : tokens.border,
              }}
            >
              {acceptTerms && <Check size={14} color={tokens.brandText} strokeWidth={3} />}
            </View>
            <Text style={{ color: tokens.textMute, fontSize: 13, flex: 1, lineHeight: 19 }}>
              I agree to the <Text style={{ color: tokens.accent, fontWeight: '600' }}>Terms of Service</Text> and{' '}
              <Text style={{ color: tokens.accent, fontWeight: '600' }}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <Button title="Create Account" onPress={handleRegister} loading={loading} disabled={!acceptTerms} size="lg" />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: tokens.textMute, fontSize: 13 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
