import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, LogOut, KeyRound, Trash2, ChevronRight, Mail,
  Volume2, Sliders, AlertCircle, Lock, FileText,
  ShieldCheck, Cookie, Sun, Moon, Monitor, Disc3, Radio,
} from 'lucide-react-native';
import { useTheme, useTokens, useIsVintage } from '../../lib/theme';
import Slider from '../../components/ui/Slider';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { hapticSuccess, hapticWarning } from '../../services/hapticService';
import { unregisterPushToken } from '../../services/notificationService';
import { MAKEYOURMUSIC_WEB_URL } from '../../lib/linking';

const SITE_URL = MAKEYOURMUSIC_WEB_URL;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { volume, setVolume, crossfade, setCrossfade, eqEnabled } = usePlayerStore();
  const { skin, palette, setSkin, setPalette } = useTheme();
  const tokens = useTokens();
  const isVintage = useIsVintage();

  const [showPassword, setShowPassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // Delete-account flow (cross-platform — Alert.prompt is iOS only, so we use a Modal)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Lock size={48} color={tokens.textMute} />
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Settings</Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 24 }}>Log in to access settings</Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  const emailVerified = (user as any)?.emailVerified;

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to enter your password to log back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          // Unregister this device's push token before clearing auth so we
          // don't keep pushing notifications to someone else's session
          await unregisterPushToken().catch(() => undefined);
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    try {
      await getApi().post('/auth/resend-verification', { email: user.email });
      hapticSuccess();
      Alert.alert('Email sent', 'Check your inbox for the verification link.');
    } catch {
      Alert.alert('Error', 'Could not resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (pwdForm.next.length < 8) {
      setPwdError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(pwdForm.next) || !/[a-z]/.test(pwdForm.next) || !/[0-9]/.test(pwdForm.next)) {
      setPwdError('Password must include uppercase, lowercase, and a number');
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('New passwords do not match');
      return;
    }
    setPwdLoading(true);
    try {
      await getApi().post('/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword: pwdForm.next,
      });
      hapticSuccess();
      Alert.alert('Password changed', 'Your password has been updated.');
      setPwdForm({ current: '', next: '', confirm: '' });
      setShowPassword(false);
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteUsername('');
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteError('');
    if (deleteUsername !== user?.username) {
      setDeleteError(`Type "${user?.username}" exactly to confirm.`);
      return;
    }
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await getApi().delete('/auth/account', {
        data: { password: deletePassword, confirmUsername: user?.username },
      });
      hapticWarning();
      setShowDeleteModal(false);
      await logout();
      router.replace('/(tabs)');
      Alert.alert('Account deleted', 'Your account and all data have been removed.');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={6}>
            <ArrowLeft size={20} color={tokens.textMute} />
          </TouchableOpacity>
          <Text
            style={{
              color: tokens.text,
              fontSize: 17,
              fontWeight: '700',
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : undefined,
            }}
          >
            Settings
          </Text>
        </View>

        {/* Email verification banner */}
        {user && emailVerified === false && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 16,
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              borderColor: 'rgba(251, 191, 36, 0.3)',
              borderWidth: 1,
              borderRadius: tokens.radiusLg,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Mail size={18} color="#fbbf24" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fcd34d', fontWeight: '600', fontSize: 13, marginBottom: 2 }}>Verify your email</Text>
              <Text style={{ color: 'rgba(252, 211, 77, 0.8)', fontSize: 12, marginBottom: 8 }}>
                Confirm {user.email} to unlock all features.
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendLoading}
                style={{
                  backgroundColor: 'rgba(251, 191, 36, 0.2)',
                  alignSelf: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: tokens.radiusMd,
                }}
                accessibilityRole="button"
                accessibilityLabel="Resend verification email"
              >
                <Text style={{ color: '#fcd34d', fontSize: 12, fontWeight: '600' }}>
                  {resendLoading ? 'Sending…' : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Appearance */}
        <Section title="Appearance" tokens={tokens}>
          <View className="px-4 py-3 border-b border-mym-border/60">
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Style</Text>
            <Text style={{ color: tokens.textMute, fontSize: 12, marginBottom: 10 }}>
              Modern is electric studio. Vintage is a tape-deck listening room.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { id: 'modern' as const, label: 'Modern', sub: 'Electric · Studio', icon: Radio },
                { id: 'vintage' as const, label: 'Vintage', sub: 'Cassette · Hi-Fi', icon: Disc3 },
              ]).map((opt) => {
                const Icon = opt.icon;
                const active = skin === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSkin(opt.id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.border,
                      backgroundColor: active ? tokens.accentSoft : tokens.surface,
                    }}
                  >
                    <Icon size={20} color={active ? tokens.accent : tokens.textMute} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>{opt.label}</Text>
                      <Text style={{ color: tokens.textMute, fontSize: 10 }}>{opt.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="px-4 py-3">
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Mode</Text>
            <Text style={{ color: tokens.textMute, fontSize: 12, marginBottom: 10 }}>
              Light follows daylight; dark for late-night listening.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                { id: 'dark' as const, label: 'Dark', icon: Moon },
                { id: 'light' as const, label: 'Light', icon: Sun },
                { id: 'system' as const, label: 'System', icon: Monitor },
              ]).map((opt) => {
                const Icon = opt.icon;
                const active = palette === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPalette(opt.id)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? tokens.accent : tokens.border,
                      backgroundColor: active ? tokens.accentSoft : tokens.surface,
                    }}
                  >
                    <Icon size={16} color={active ? tokens.accent : tokens.textMute} />
                    <Text
                      style={{
                        color: active ? tokens.accent : tokens.textMute,
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Section>

        {/* Audio */}
        <Section title="Audio" tokens={tokens}>
          <Row icon={<Volume2 size={18} color={tokens.textMute} />} label="Volume" sublabel={`${Math.round(volume * 100)}%`} tokens={tokens}>
            <View style={{ width: 128 }}>
              <Slider value={volume} max={1} onValueChange={setVolume} />
            </View>
          </Row>
          <Row
            icon={<Sliders size={18} color={tokens.textMute} />}
            label="Crossfade"
            sublabel={crossfade === 0 ? 'Off' : `${crossfade}s`}
            tokens={tokens}
          >
            <View style={{ width: 128 }}>
              <Slider
                value={crossfade}
                max={12}
                onValueChange={(v) => setCrossfade(Math.round(v))}
              />
            </View>
          </Row>
          {/* Equalizer — not yet wired to the native audio session on mobile. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              opacity: 0.6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Sliders size={18} color={tokens.textMute} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: tokens.text, fontSize: 13 }}>Equalizer</Text>
                  <View
                    style={{
                      backgroundColor: tokens.border,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: tokens.textMute,
                        letterSpacing: 1,
                      }}
                    >
                      Web only
                    </Text>
                  </View>
                </View>
                <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>
                  Native mobile EQ is coming soon. Configure on web for now.
                </Text>
              </View>
            </View>
            <Switch
              value={eqEnabled}
              disabled
              trackColor={{ false: tokens.border, true: tokens.accent }}
              thumbColor="#fff"
            />
          </View>
        </Section>

        {/* Security */}
        <Section title="Security" tokens={tokens}>
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
            }}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <KeyRound size={18} color={tokens.textMute} />
              <Text style={{ color: tokens.text, fontSize: 13 }}>Change password</Text>
            </View>
            <ChevronRight
              size={16}
              color={tokens.textMute}
              style={{ transform: [{ rotate: showPassword ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>
          {showPassword && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 8,
                backgroundColor: tokens.bg,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}
            >
              {pwdError ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                    backgroundColor: 'rgba(248, 113, 113, 0.16)',
                    borderColor: 'rgba(248, 113, 113, 0.3)',
                    borderWidth: 1,
                    borderRadius: tokens.radiusMd,
                    padding: 8,
                    marginBottom: 8,
                  }}
                >
                  <AlertCircle size={14} color="#f87171" />
                  <Text style={{ color: '#f87171', fontSize: 12, flex: 1 }}>{pwdError}</Text>
                </View>
              ) : null}
              <Input
                label="Current password"
                value={pwdForm.current}
                onChangeText={(v) => setPwdForm((p) => ({ ...p, current: v }))}
                secureTextEntry
              />
              <Input
                label="New password"
                value={pwdForm.next}
                onChangeText={(v) => setPwdForm((p) => ({ ...p, next: v }))}
                secureTextEntry
                placeholder="8+ chars, 1 upper, 1 lower, 1 number"
              />
              <Input
                label="Confirm new password"
                value={pwdForm.confirm}
                onChangeText={(v) => setPwdForm((p) => ({ ...p, confirm: v }))}
                secureTextEntry
              />
              <Button title="Update password" onPress={handleChangePassword} loading={pwdLoading} />
            </View>
          )}
        </Section>

        {/* About */}
        <Section title="About" tokens={tokens}>
          <LinkRow icon={<FileText size={18} color={tokens.textMute} />} label="Terms of Service" onPress={() => Linking.openURL(`${SITE_URL}/terms`)} tokens={tokens} />
          <LinkRow icon={<ShieldCheck size={18} color={tokens.textMute} />} label="Privacy Policy" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)} tokens={tokens} />
          <LinkRow icon={<Cookie size={18} color={tokens.textMute} />} label="Cookie Policy" onPress={() => Linking.openURL(`${SITE_URL}/cookies`)} tokens={tokens} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>MakeYourMusic</Text>
            <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>AI-Generated Music Platform — v1.0.0</Text>
          </View>
        </Section>

        {/* Delete account modal (cross-platform) */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                backgroundColor: tokens.card,
                borderColor: 'rgba(248, 113, 113, 0.3)',
                borderWidth: 1,
                borderRadius: tokens.radiusLg,
                width: '100%',
                maxWidth: 480,
                overflow: 'hidden',
              }}
            >
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(248, 113, 113, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={18} color="#f87171" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tokens.text, fontSize: 17, fontWeight: '700' }}>Delete account</Text>
                    <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }}>
                      Permanently removes your account and all data. This cannot be undone.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ padding: 20 }}>
                {deleteError ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 8,
                      backgroundColor: 'rgba(248, 113, 113, 0.16)',
                      borderColor: 'rgba(248, 113, 113, 0.3)',
                      borderWidth: 1,
                      borderRadius: tokens.radiusMd,
                      padding: 8,
                      marginBottom: 12,
                    }}
                  >
                    <AlertCircle size={14} color="#f87171" />
                    <Text style={{ color: '#f87171', fontSize: 12, flex: 1 }}>{deleteError}</Text>
                  </View>
                ) : null}
                <Input
                  label={`Type "${user?.username}" to confirm`}
                  value={deleteUsername}
                  onChangeText={setDeleteUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Input
                  label="Password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, padding: 20, paddingTop: 0 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setShowDeleteModal(false)}
                  />
                </View>
                <TouchableOpacity
                  onPress={confirmDeleteAccount}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: tokens.radiusLg,
                    backgroundColor: '#dc2626',
                    minHeight: 48,
                    opacity: deleting ? 0.6 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Danger zone */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 24,
            borderRadius: tokens.radiusLg,
            backgroundColor: tokens.card,
            borderColor: 'rgba(248, 113, 113, 0.2)',
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              color: 'rgba(248, 113, 113, 0.8)',
              fontSize: 11,
              textTransform: 'uppercase',
              fontWeight: '700',
              letterSpacing: 1,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            Danger zone
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: tokens.border,
            }}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <LogOut size={18} color="#f87171" />
            <Text style={{ color: '#f87171', fontSize: 13 }}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: tokens.border,
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Trash2 size={18} color="#f87171" />
            <View>
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '600' }}>Delete account</Text>
              <Text style={{ color: 'rgba(248, 113, 113, 0.6)', fontSize: 11, marginTop: 2 }}>
                Permanently remove your account and all data
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Section({ title, children, tokens }: { title: string; children: any; tokens: ReturnType<typeof useTokens> }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <Text
        style={{
          color: tokens.textMute,
          fontSize: 11,
          textTransform: 'uppercase',
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: tokens.card,
          borderColor: tokens.border,
          borderWidth: 1,
          borderRadius: tokens.radiusLg,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  sublabel,
  children,
  tokens,
}: {
  icon: any;
  label: string;
  sublabel?: string;
  children?: any;
  tokens: ReturnType<typeof useTokens>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {icon}
        <View>
          <Text style={{ color: tokens.text, fontSize: 13 }}>{label}</Text>
          {sublabel && <Text style={{ color: tokens.textMute, fontSize: 11 }}>{sublabel}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  tokens,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  tokens: ReturnType<typeof useTokens>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {icon}
        <Text style={{ color: tokens.text, fontSize: 13 }}>{label}</Text>
      </View>
      <ChevronRight size={16} color={tokens.textMute} />
    </TouchableOpacity>
  );
}
