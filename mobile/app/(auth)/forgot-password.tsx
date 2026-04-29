import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity onPress={() => router.back()} className="px-4 py-3 flex-row items-center">
          <ArrowLeft size={20} color="#a1a1aa" />
          <Text className="text-morlo-muted ml-2">Back</Text>
        </TouchableOpacity>

        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-morlo-accent/10 items-center justify-center mb-4">
              <Mail size={28} color="#8b5cf6" />
            </View>
            <Text className="text-morlo-text text-2xl font-bold mb-1">Reset your password</Text>
            <Text className="text-morlo-muted text-sm text-center">
              We&apos;ll send you a link to create a new password
            </Text>
          </View>

          {submitted ? (
            <View>
              <View className="flex-row items-start gap-3 bg-green-900/30 border border-green-500/30 rounded-xl p-4 mb-6">
                <CheckCircle2 size={20} color="#4ade80" />
                <View className="flex-1">
                  <Text className="text-green-400 font-semibold mb-1">Check your inbox</Text>
                  <Text className="text-green-300/80 text-sm">
                    If an account with that email exists, we&apos;ve sent a reset link. It expires in 1 hour.
                  </Text>
                </View>
              </View>
              <Button title="Back to Log In" onPress={() => router.replace('/(auth)/login')} size="lg" />
            </View>
          ) : (
            <>
              {error ? (
                <View className="bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-400 text-sm">{error}</Text>
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
                className="items-center mt-6"
              >
                <Text className="text-morlo-muted text-sm">Remembered your password? <Text className="text-morlo-accent font-semibold">Log in</Text></Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
