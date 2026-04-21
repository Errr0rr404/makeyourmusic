import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
  const router = useRouter();
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
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="items-center mb-10">
            <Text className="text-morlo-accent text-4xl font-bold">Morlo</Text>
            <Text className="text-morlo-muted text-sm mt-1">AI-Generated Music</Text>
          </View>

          <Text className="text-morlo-text text-2xl font-bold mb-6">Create account</Text>

          {error ? (
            <View className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          ) : null}

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
            className="flex-row items-start gap-2 mb-4"
          >
            <View className={`w-5 h-5 rounded border items-center justify-center mt-0.5 ${acceptTerms ? 'bg-morlo-accent border-morlo-accent' : 'border-morlo-border bg-morlo-card'}`}>
              {acceptTerms && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-morlo-muted text-sm flex-1">
              I agree to the <Text className="text-morlo-accent font-semibold">Terms of Service</Text> and <Text className="text-morlo-accent font-semibold">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <Button title="Create Account" onPress={handleRegister} loading={loading} disabled={!acceptTerms} size="lg" />

          <View className="flex-row items-center justify-center mt-6">
            <Text className="text-morlo-muted text-sm">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-morlo-accent text-sm font-semibold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
