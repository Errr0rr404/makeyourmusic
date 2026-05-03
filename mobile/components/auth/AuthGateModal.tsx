import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@makeyourmusic/shared';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SocialAuthButtons } from './SocialAuthButtons';
import { useTokens, useIsVintage } from '../../lib/theme';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToRegister?: () => void;
}

export function AuthGateModal({ visible, onClose, onSuccess, onNavigateToRegister }: Props) {
  const tokens = useTokens();
  const isVintage = useIsVintage();
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
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    onNavigateToRegister?.();
    router.push('/(auth)/register');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View
              style={{
                backgroundColor: tokens.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingHorizontal: 24,
                paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                borderTopWidth: 1,
                borderColor: tokens.border,
                maxHeight: '90%',
              }}
            >
              {/* Handle + close */}
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: tokens.border,
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ position: 'absolute', top: 16, right: 16, padding: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={tokens.textMute} />
              </TouchableOpacity>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text
                  style={{
                    color: tokens.text,
                    fontSize: 22,
                    fontWeight: '800',
                    marginBottom: 4,
                    marginTop: 8,
                    fontFamily: isVintage ? tokens.fontDisplay : undefined,
                    letterSpacing: isVintage ? 0.5 : 0,
                    textTransform: isVintage ? 'uppercase' : undefined,
                  }}
                >
                  Almost there!
                </Text>
                <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 20 }}>
                  Sign in to generate your track — it only takes a second.
                </Text>

                {error ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(248,113,113,0.16)',
                      borderColor: 'rgba(248,113,113,0.5)',
                      borderWidth: 1,
                      borderRadius: tokens.radiusLg,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginBottom: 14,
                    }}
                  >
                    <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
                  </View>
                ) : null}

                <SocialAuthButtons onError={setError} onSuccess={onSuccess} />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
                  <Text
                    style={{
                      color: tokens.textMute,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      marginHorizontal: 10,
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

                <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 16,
                  }}
                >
                  <Text style={{ color: tokens.textMute, fontSize: 13 }}>No account? </Text>
                  <TouchableOpacity onPress={handleRegister} accessibilityRole="button">
                    <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>
                      Sign up free
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
