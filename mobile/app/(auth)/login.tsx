import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';

export default function LoginScreen() {
  const router = useRouter();
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
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="items-center mb-10">
            <Text className="text-mym-accent text-4xl font-bold">MakeYourMusic</Text>
            <Text className="text-mym-muted text-sm mt-1">AI-Generated Music</Text>
          </View>

          {/* Form */}
          <Text className="text-mym-text text-2xl font-bold mb-6">Welcome back</Text>

          {error ? (
            <View className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          ) : null}

          <SocialAuthButtons
            onError={setError}
            onSuccess={() => router.replace('/(tabs)')}
          />

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-mym-border" />
            <Text className="text-mym-muted text-xs uppercase mx-3 tracking-wider">or with email</Text>
            <View className="flex-1 h-px bg-mym-border" />
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
            className="mb-4 -mt-2 self-end"
          >
            <Text className="text-mym-accent text-xs font-semibold">Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />

          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-mym-muted text-sm">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text className="text-mym-accent text-sm font-semibold">Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Skip */}
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="items-center mt-4"
          >
            <Text className="text-mym-muted text-sm">Continue as guest</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
