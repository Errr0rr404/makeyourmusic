import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@morlo/shared';
import {
  ArrowLeft, LogOut, KeyRound, Trash2, ChevronRight, Mail,
  Volume2, Sliders, AlertCircle, CheckCircle2, Lock, FileText,
  ShieldCheck, Cookie,
} from 'lucide-react-native';
import Slider from '../../components/ui/Slider';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { hapticSuccess, hapticWarning } from '../../services/hapticService';
import { unregisterPushToken } from '../../services/notificationService';

const SITE_URL = 'https://morlo.ai';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { volume, setVolume, crossfade, setCrossfade, eqEnabled } = usePlayerStore();

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
        <View className="flex-1 items-center justify-center px-6">
          <Lock size={48} color="#71717a" />
          <Text className="text-morlo-text text-xl font-bold mt-4 mb-2">Settings</Text>
          <Text className="text-morlo-muted text-sm mb-6">Log in to access settings</Text>
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
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text className="text-morlo-text text-lg font-bold">Settings</Text>
        </View>

        {/* Email verification banner */}
        {user && emailVerified === false && (
          <View className="mx-4 mb-4 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex-row items-start gap-3">
            <Mail size={18} color="#fbbf24" />
            <View className="flex-1">
              <Text className="text-amber-300 font-semibold text-sm mb-0.5">Verify your email</Text>
              <Text className="text-amber-200/80 text-xs mb-2">
                Confirm {user.email} to unlock all features.
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendLoading}
                className="bg-amber-500/20 self-start px-3 py-1.5 rounded-lg"
              >
                <Text className="text-amber-200 text-xs font-semibold">
                  {resendLoading ? 'Sending…' : 'Resend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Audio */}
        <Section title="Audio">
          <Row icon={<Volume2 size={18} color="#a1a1aa" />} label="Volume" sublabel={`${Math.round(volume * 100)}%`}>
            <View className="w-32">
              <Slider value={volume} max={1} onValueChange={setVolume} />
            </View>
          </Row>
          <Row
            icon={<Sliders size={18} color="#a1a1aa" />}
            label="Crossfade"
            sublabel={crossfade === 0 ? 'Off' : `${crossfade}s`}
          >
            <View className="w-32">
              <Slider
                value={crossfade}
                max={12}
                onValueChange={(v) => setCrossfade(Math.round(v))}
              />
            </View>
          </Row>
          {/* Equalizer — not yet wired to the native audio session on mobile.
              The 7-band EQ state still syncs with your web account, so whatever
              you've got configured on web follows you there. Native audio EQ
              requires a Swift (AVAudioUnitEQ) / Kotlin (AudioEffect) module we
              haven't shipped yet. */}
          <View className="flex-row items-center justify-between px-4 py-3 opacity-60">
            <View className="flex-row items-center gap-3 flex-1">
              <Sliders size={18} color="#a1a1aa" />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-morlo-text text-sm">Equalizer</Text>
                  <View className="bg-morlo-border/60 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-bold uppercase text-morlo-muted tracking-wider">
                      Web only
                    </Text>
                  </View>
                </View>
                <Text className="text-morlo-muted text-xs">
                  Native mobile EQ is coming soon. Configure on web for now.
                </Text>
              </View>
            </View>
            <Switch
              value={eqEnabled}
              disabled
              trackColor={{ false: '#2a2a2a', true: '#8b5cf6' }}
              thumbColor="#fff"
            />
          </View>
        </Section>

        {/* Security */}
        <Section title="Security">
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            className="flex-row items-center justify-between px-4 py-3 border-b border-morlo-border/60"
          >
            <View className="flex-row items-center gap-3">
              <KeyRound size={18} color="#a1a1aa" />
              <Text className="text-morlo-text text-sm">Change password</Text>
            </View>
            <ChevronRight size={16} color="#71717a" style={{ transform: [{ rotate: showPassword ? '90deg' : '0deg' }] }} />
          </TouchableOpacity>
          {showPassword && (
            <View className="px-4 pt-3 pb-2 bg-morlo-bg/40 border-b border-morlo-border/60">
              {pwdError ? (
                <View className="flex-row items-start gap-2 bg-red-900/30 border border-red-500/30 rounded-lg p-2 mb-2">
                  <AlertCircle size={14} color="#f87171" />
                  <Text className="text-red-400 text-xs flex-1">{pwdError}</Text>
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
        <Section title="About">
          <LinkRow icon={<FileText size={18} color="#a1a1aa" />} label="Terms of Service" onPress={() => Linking.openURL(`${SITE_URL}/terms`)} />
          <LinkRow icon={<ShieldCheck size={18} color="#a1a1aa" />} label="Privacy Policy" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)} />
          <LinkRow icon={<Cookie size={18} color="#a1a1aa" />} label="Cookie Policy" onPress={() => Linking.openURL(`${SITE_URL}/cookies`)} />
          <View className="px-4 py-3">
            <Text className="text-morlo-text text-sm font-semibold">Morlo.ai</Text>
            <Text className="text-morlo-muted text-xs mt-0.5">AI-Generated Music Platform — v1.0.0</Text>
          </View>
        </Section>

        {/* Delete account modal (cross-platform) */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View className="flex-1 bg-black/70 items-center justify-center px-5">
            <View className="bg-morlo-card border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden">
              <View className="p-5 border-b border-morlo-border">
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center">
                    <Trash2 size={18} color="#f87171" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-morlo-text text-lg font-bold">Delete account</Text>
                    <Text className="text-morlo-muted text-sm mt-1">
                      Permanently removes your account and all data. This cannot be undone.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-5">
                {deleteError ? (
                  <View className="flex-row items-start gap-2 bg-red-900/30 border border-red-500/30 rounded-lg p-2 mb-3">
                    <AlertCircle size={14} color="#f87171" />
                    <Text className="text-red-400 text-xs flex-1">{deleteError}</Text>
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

              <View className="flex-row gap-3 p-5 pt-0">
                <View className="flex-1">
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setShowDeleteModal(false)}
                  />
                </View>
                <TouchableOpacity
                  onPress={confirmDeleteAccount}
                  disabled={deleting}
                  className="flex-1 items-center justify-center rounded-xl bg-red-600"
                  style={{ opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Danger zone */}
        <View className="mx-4 mb-6 rounded-xl bg-morlo-card border border-red-500/20 overflow-hidden">
          <Text className="text-red-400/80 text-xs uppercase font-bold tracking-wider px-4 pt-3 pb-2">Danger zone</Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-3 px-4 py-3 border-t border-morlo-border/60"
          >
            <LogOut size={18} color="#f87171" />
            <Text className="text-red-400 text-sm">Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="flex-row items-start gap-3 px-4 py-3 border-t border-morlo-border/60"
          >
            <Trash2 size={18} color="#f87171" />
            <View>
              <Text className="text-red-400 text-sm font-semibold">Delete account</Text>
              <Text className="text-red-400/60 text-xs">Permanently remove your account and all data</Text>
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View className="mx-4 mb-4">
      <Text className="text-morlo-muted text-xs uppercase font-bold tracking-wider mb-2 px-1">{title}</Text>
      <View className="bg-morlo-card border border-morlo-border rounded-xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function Row({ icon, label, sublabel, children }: { icon: any; label: string; sublabel?: string; children?: any }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-morlo-border/60">
      <View className="flex-row items-center gap-3">
        {icon}
        <View>
          <Text className="text-morlo-text text-sm">{label}</Text>
          {sublabel && <Text className="text-morlo-muted text-xs">{sublabel}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between px-4 py-3 border-b border-morlo-border/60">
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-morlo-text text-sm">{label}</Text>
      </View>
      <ChevronRight size={16} color="#71717a" />
    </TouchableOpacity>
  );
}
