import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No reset token provided. Use the link from your email.');
    }
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
      setTimeout(() => router.replace('/(auth)/login'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Password reset failed');
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
          <Text className="text-morlo-text text-2xl font-bold mb-2">Choose a new password</Text>
          <Text className="text-morlo-muted text-sm mb-6">
            At least 8 characters with an uppercase letter, lowercase letter, and number.
          </Text>

          {success ? (
            <View className="flex-row items-start gap-3 bg-green-900/30 border border-green-500/30 rounded-xl p-4">
              <CheckCircle2 size={20} color="#4ade80" />
              <View className="flex-1">
                <Text className="text-green-400 font-semibold mb-1">Password updated</Text>
                <Text className="text-green-300/80 text-sm">Redirecting to login…</Text>
              </View>
            </View>
          ) : (
            <>
              {error ? (
                <View className="flex-row items-start gap-2 bg-red-900/30 border border-red-500/50 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={16} color="#f87171" />
                  <Text className="text-red-400 text-sm flex-1">{error}</Text>
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
