import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, Pencil, User as UserIcon, Heart, Clock, Music,
  Globe, LockKeyhole, Trash2, Sparkles, Settings as SettingsIcon,
  Camera, AlertCircle, Crown, Shield, Calendar,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ThemeQuickMenu } from '../../components/ThemeQuickMenu';
import { pickAndUploadImage } from '../../lib/uploadImage';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';
import { useTokens, useIsVintage, type ThemeTokens } from '../../lib/theme';

interface Track {
  id: string;
  title: string;
  slug: string;
  coverArt: string | null;
  duration: number;
  isPublic: boolean;
  playCount: number;
  likeCount: number;
  agent: { id: string; name: string; slug: string };
}

export default function ProfileScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { user, isAuthenticated, fetchUser } = useAuthStore();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', avatar: '' });
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [tab, setTab] = useState<'all' | 'public' | 'private'>('all');
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        bio: (user as any).bio || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const loadTracks = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingTracks(true);
    try {
      const res = await getApi().get('/tracks/mine?limit=50');
      setMyTracks(res.data.tracks || []);
    } catch {
      setMyTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      loadTracks();
    }, [loadTracks])
  );

  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <UserIcon size={48} color={tokens.textMute} />
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
            Your Profile
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
            Log in to view and edit your profile
          </Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  const handleUploadAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const asset = await pickAndUploadImage({ aspect: [1, 1], quality: 0.9 });
      if (asset?.url) {
        setForm((p) => ({ ...p, avatar: asset.url }));
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err?.response?.data?.error || err?.message || 'Unknown error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await getApi().put('/auth/profile', {
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        avatar: form.avatar.trim() || undefined,
      });
      await fetchUser();
      setEditing(false);
      hapticSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (track: Track) => {
    if (!track?.id) {
      console.error('toggleVisibility called with invalid track:', track);
      Alert.alert('Error', 'Invalid track data');
      return;
    }
    const next = !track.isPublic;
    setMyTracks((ts) => ts.map((t) => (t.id === track.id ? { ...t, isPublic: next } : t)));
    try {
      await getApi().patch(`/tracks/${track.id}/visibility`, { isPublic: next });
    } catch (err: any) {
      console.error('Toggle visibility failed:', err?.response?.data || err?.message);
      setMyTracks((ts) => ts.map((t) => (t.id === track.id ? { ...t, isPublic: !next } : t)));
      const errorMessage = typeof err?.response?.data?.error === 'string'
        ? err.response.data.error
        : 'Could not update visibility';
      Alert.alert('Error', errorMessage);
      return;
    }
    try {
      hapticSelection();
    } catch (e) {
      console.error('Haptic feedback failed:', e);
    }
  };

  const deleteTrack = async (track: Track) => {
    Alert.alert(
      `Delete "${track.title}"?`,
      'This will permanently remove the track, its plays, likes, and comments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await getApi().delete(`/tracks/${track.id}`);
              setMyTracks((ts) => ts.filter((t) => t.id !== track.id));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const filtered = myTracks.filter((t) => {
    if (tab === 'public') return t.isPublic;
    if (tab === 'private') return !t.isPublic;
    return true;
  });

  const role = user?.role;
  const RoleIcon = role === 'ADMIN' ? Shield : role === 'AGENT_OWNER' ? Crown : Music;
  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'AGENT_OWNER' ? 'Creator' : 'Listener';
  const roleColor = role === 'ADMIN' ? '#f87171' : role === 'AGENT_OWNER' ? '#a855f7' : '#60a5fa';

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
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
            Profile
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ThemeQuickMenu />
            <TouchableOpacity onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={6}>
              <SettingsIcon size={20} color={tokens.textMute} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar + info */}
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <TouchableOpacity
            onPress={editing ? handleUploadAvatar : undefined}
            style={{ position: 'relative' }}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Change avatar' : undefined}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: isVintage ? tokens.radiusLg : 48,
                backgroundColor: tokens.card,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: tokens.border,
              }}
            >
              {form.avatar ? (
                <Image
                  source={{ uri: form.avatar }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={{ color: tokens.accent, fontSize: 36, fontWeight: '700' }}>
                  {(user?.displayName || user?.username || 'U')[0]?.toUpperCase()}
                </Text>
              )}
              {uploadingAvatar && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator color={tokens.brand} />
                </View>
              )}
            </View>
            {editing && (
              <View
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  backgroundColor: tokens.brand,
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: tokens.bg,
                }}
              >
                <Camera size={14} color={tokens.brandText} />
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <Text
              style={{
                color: tokens.text,
                fontSize: 20,
                fontWeight: '700',
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
              }}
            >
              {user?.displayName || user?.username}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: `${roleColor}20`,
              }}
            >
              <RoleIcon size={10} color={roleColor} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: roleColor }}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={{ color: tokens.textMute, fontSize: 13 }}>@{user?.username}</Text>
          <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>{user?.email}</Text>
        </View>

        {/* Edit form / view */}
        {editing ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor: 'rgba(248, 113, 113, 0.16)',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                  borderWidth: 1,
                  borderRadius: tokens.radiusLg,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <AlertCircle size={16} color="#f87171" />
                <Text style={{ color: '#f87171', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}
            <Input
              label="Display name"
              placeholder="Your display name"
              value={form.displayName}
              onChangeText={(v) => setForm((p) => ({ ...p, displayName: v }))}
              maxLength={100}
            />
            <Input
              label="Bio"
              placeholder="Tell others about yourself"
              value={form.bio}
              onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditing(false);
                    setError('');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Save" onPress={handleSave} loading={saving} />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            {(user as any)?.bio ? (
              <Text style={{ color: tokens.textSoft, fontSize: 13, paddingHorizontal: 8, marginBottom: 12, lineHeight: 19 }}>
                {(user as any).bio}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={{
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
                borderRadius: tokens.radiusLg,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Pencil size={14} color={tokens.textMute} />
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick links */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          style={{ marginTop: 20 }}
        >
          <QuickLink
            icon={<Sparkles size={14} color={tokens.brand} />}
            label="Create music"
            onPress={() => router.push('/create')}
            primary
            tokens={tokens}
          />
          <QuickLink
            icon={<Sparkles size={14} color={tokens.textMute} />}
            label="My generations"
            onPress={() => router.push('/studio/generations')}
            tokens={tokens}
          />
          <QuickLink
            icon={<Heart size={14} color={tokens.textMute} />}
            label="Liked songs"
            onPress={() => router.push('/(tabs)/library')}
            tokens={tokens}
          />
          <QuickLink
            icon={<Clock size={14} color={tokens.textMute} />}
            label="History"
            onPress={() => router.push('/(tabs)/library')}
            tokens={tokens}
          />
        </ScrollView>

        {/* Your tracks */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Music size={16} color={tokens.accent} />
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 17,
                  fontWeight: '700',
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                }}
              >
                Your tracks
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 12 }}>({myTracks.length})</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
            {(['all', 'public', 'private'] as const).map((t) => {
              const count =
                t === 'all'
                  ? myTracks.length
                  : myTracks.filter((x) => (t === 'public' ? x.isPublic : !x.isPublic)).length;
              const active = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderBottomWidth: 2,
                    marginBottom: -1,
                    borderBottomColor: active ? tokens.accent : 'transparent',
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      textTransform: 'capitalize',
                      color: active ? tokens.text : tokens.textMute,
                      fontWeight: active ? '600' : '500',
                    }}
                  >
                    {t} <Text style={{ color: tokens.textMute, fontSize: 11 }}>({count})</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loadingTracks ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={tokens.brand} />
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{
                paddingVertical: 40,
                alignItems: 'center',
                backgroundColor: tokens.card,
                borderRadius: tokens.radiusLg,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
            >
              <Sparkles size={32} color={tokens.textMute} />
              <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 8, marginBottom: 12 }}>
                {tab === 'private' ? 'No private tracks yet' : tab === 'public' ? 'No public tracks yet' : 'No tracks yet'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/create')}
                style={{
                  backgroundColor: tokens.brand,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                }}
                accessibilityRole="button"
              >
                <Text style={{ color: tokens.brandText, fontSize: 13, fontWeight: '600' }}>Create with AI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {filtered.map((track) => (
                <View
                  key={track.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    marginBottom: 8,
                    borderRadius: tokens.radiusLg,
                    backgroundColor: tokens.card,
                    borderWidth: 1,
                    borderColor: tokens.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => playTrack(track as any, filtered as any)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: isVintage ? tokens.radiusSm : 8,
                      overflow: 'hidden',
                      backgroundColor: tokens.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title}`}
                  >
                    {track.coverArt ? (
                      <Image
                        source={{ uri: track.coverArt }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={track.id}
                      />
                    ) : (
                      <Music size={16} color={tokens.textMute} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/track/${track.slug}`)}
                    accessibilityRole="button"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text
                        style={{ color: tokens.text, fontSize: 13, fontWeight: '600', flexShrink: 1 }}
                        numberOfLines={1}
                      >
                        {track.title}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: track.isPublic ? 'rgba(74, 222, 128, 0.16)' : 'rgba(251, 191, 36, 0.16)',
                        }}
                      >
                        {track.isPublic ? (
                          <Globe size={9} color="#4ade80" />
                        ) : (
                          <LockKeyhole size={9} color="#fbbf24" />
                        )}
                        <Text style={{ fontSize: 10, fontWeight: '500', color: track.isPublic ? '#86efac' : '#fcd34d' }}>
                          {track.isPublic ? 'Public' : 'Private'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {track.agent?.name} · {track.playCount ?? 0} plays
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleVisibility(track)} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel={track.isPublic ? 'Make private' : 'Make public'}>
                    {track.isPublic ? (
                      <LockKeyhole size={16} color={tokens.textMute} />
                    ) : (
                      <Globe size={16} color={tokens.textMute} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTrack(track)} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Delete track">
                    <Trash2 size={16} color="#f87171" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Member since */}
        {user?.createdAt && (
          <View style={{ paddingHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={12} color={tokens.textMute} />
            <Text style={{ color: tokens.textMute, fontSize: 11 }}>
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
  primary,
  tokens,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  primary?: boolean;
  tokens: ThemeTokens;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: primary ? tokens.accentSoft : tokens.card,
        borderWidth: 1,
        borderColor: primary ? `${tokens.brand}40` : tokens.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: primary ? tokens.brand : tokens.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
