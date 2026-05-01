import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Logo size={72} />
            <Text
              style={{
                color: tokens.text,
                fontSize: 24,
                fontWeight: '800',
                marginTop: 16,
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                letterSpacing: isVintage ? 1 : -0.5,
                textTransform: isVintage ? 'uppercase' : undefined,
              }}
            >
              MakeYourMusic
            </Text>
            <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }}>AI-Generated Music</Text>
          </View>

          {/* Form */}
          <Text
            style={{
              color: tokens.text,
              fontSize: 22,
              fontWeight: '700',
              marginBottom: 24,
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
            }}
          >
            Welcome back
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
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={{ marginBottom: 16, marginTop: -8, alignSelf: 'flex-end' }}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={{ color: tokens.accent, fontSize: 12, fontWeight: '600' }}>Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: tokens.textMute, fontSize: 13 }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')} accessibilityRole="button">
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Skip */}
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{ alignItems: 'center', marginTop: 16 }}
            accessibilityRole="button"
          >
            <Text style={{ color: tokens.textMute, fontSize: 13 }}>Continue as guest</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
