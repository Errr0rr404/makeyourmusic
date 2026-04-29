import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, Pencil, Save, X, User as UserIcon, Heart, Clock, Music,
  Globe, LockKeyhole, Trash2, Sparkles, Settings as SettingsIcon,
  Camera, AlertCircle, Crown, Shield, Calendar,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { pickAndUploadImage } from '../../lib/uploadImage';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';

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
        <View className="flex-1 items-center justify-center px-6">
          <UserIcon size={48} color="#71717a" />
          <Text className="text-mym-text text-xl font-bold mt-4 mb-2">Your Profile</Text>
          <Text className="text-mym-muted text-sm mb-6 text-center">Log in to view and edit your profile</Text>
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
    const next = !track.isPublic;
    setMyTracks((ts) => ts.map((t) => (t.id === track.id ? { ...t, isPublic: next } : t)));
    try {
      await getApi().patch(`/tracks/${track.id}/visibility`, { isPublic: next });
      hapticSelection();
    } catch {
      setMyTracks((ts) => ts.map((t) => (t.id === track.id ? { ...t, isPublic: !next } : t)));
      Alert.alert('Error', 'Could not update visibility');
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
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text className="text-mym-text text-lg font-bold">Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <SettingsIcon size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {/* Avatar + info */}
        <View className="items-center py-4">
          <TouchableOpacity onPress={editing ? handleUploadAvatar : undefined} className="relative">
            <View className="w-24 h-24 rounded-full bg-mym-card items-center justify-center overflow-hidden border-2 border-mym-border">
              {form.avatar ? (
                <Image source={{ uri: form.avatar }} className="w-full h-full" />
              ) : (
                <Text className="text-mym-accent text-4xl font-bold">
                  {(user?.displayName || user?.username || 'U')[0]?.toUpperCase()}
                </Text>
              )}
              {uploadingAvatar && (
                <View className="absolute inset-0 bg-black/60 items-center justify-center">
                  <ActivityIndicator color="#8b5cf6" />
                </View>
              )}
            </View>
            {editing && (
              <View className="absolute -bottom-1 -right-1 bg-mym-accent rounded-full w-8 h-8 items-center justify-center border-2 border-mym-bg">
                <Camera size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center gap-2 mt-4">
            <Text className="text-mym-text text-xl font-bold">
              {user?.displayName || user?.username}
            </Text>
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}20` }}>
              <RoleIcon size={10} color={roleColor} />
              <Text className="text-xs font-semibold" style={{ color: roleColor }}>{roleLabel}</Text>
            </View>
          </View>
          <Text className="text-mym-muted text-sm">@{user?.username}</Text>
          <Text className="text-mym-muted text-xs mt-0.5">{user?.email}</Text>
        </View>

        {/* Edit form */}
        {editing ? (
          <View className="px-4 pt-2">
            {error ? (
              <View className="flex-row items-start gap-2 bg-red-900/30 border border-red-500/30 rounded-xl p-3 mb-3">
                <AlertCircle size={16} color="#f87171" />
                <Text className="text-red-400 text-sm flex-1">{error}</Text>
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
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditing(false);
                    setError('');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button title="Save" onPress={handleSave} loading={saving} />
              </View>
            </View>
          </View>
        ) : (
          <View className="px-4 pt-2">
            {(user as any)?.bio ? (
              <Text className="text-mym-text text-sm px-2 mb-3">{(user as any).bio}</Text>
            ) : null}
            <TouchableOpacity
              onPress={() => setEditing(true)}
              className="bg-mym-card border border-mym-border rounded-xl px-4 py-3 flex-row items-center justify-center gap-2"
            >
              <Pencil size={14} color="#a1a1aa" />
              <Text className="text-mym-text text-sm font-semibold">Edit profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick links */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} className="mt-5">
          <QuickLink icon={<Sparkles size={14} color="#8b5cf6" />} label="Create music" onPress={() => router.push('/create')} primary />
          <QuickLink icon={<Sparkles size={14} color="#a1a1aa" />} label="My generations" onPress={() => router.push('/studio/generations')} />
          <QuickLink icon={<Heart size={14} color="#a1a1aa" />} label="Liked songs" onPress={() => router.push('/(tabs)/library')} />
          <QuickLink icon={<Clock size={14} color="#a1a1aa" />} label="History" onPress={() => router.push('/(tabs)/library')} />
        </ScrollView>

        {/* Your tracks */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Music size={16} color="#8b5cf6" />
              <Text className="text-mym-text text-lg font-bold">Your tracks</Text>
              <Text className="text-mym-muted text-xs">({myTracks.length})</Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-3 border-b border-mym-border">
            {(['all', 'public', 'private'] as const).map((t) => {
              const count =
                t === 'all' ? myTracks.length : myTracks.filter((x) => (t === 'public' ? x.isPublic : !x.isPublic)).length;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  className={`px-3 py-2 border-b-2 -mb-px ${tab === t ? 'border-mym-accent' : 'border-transparent'}`}
                >
                  <Text className={`text-sm capitalize ${tab === t ? 'text-mym-text font-semibold' : 'text-mym-muted'}`}>
                    {t} <Text className="text-mym-muted text-xs">({count})</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loadingTracks ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#8b5cf6" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="py-10 items-center bg-mym-card rounded-xl border border-mym-border">
              <Sparkles size={32} color="#71717a" />
              <Text className="text-mym-muted text-sm mt-2 mb-3">
                {tab === 'private' ? 'No private tracks yet' : tab === 'public' ? 'No public tracks yet' : 'No tracks yet'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/create')}
                className="bg-mym-accent px-4 py-2 rounded-full"
              >
                <Text className="text-white text-sm font-semibold">Create with AI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {filtered.map((track) => (
                <View
                  key={track.id}
                  className="flex-row items-center gap-3 p-2 mb-2 rounded-xl bg-mym-card border border-mym-border"
                >
                  <TouchableOpacity
                    onPress={() => playTrack(track as any, filtered as any)}
                    className="w-12 h-12 rounded-lg overflow-hidden bg-mym-surface items-center justify-center"
                  >
                    {track.coverArt ? (
                      <Image source={{ uri: track.coverArt }} className="w-full h-full" />
                    ) : (
                      <Music size={16} color="#71717a" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1" onPress={() => router.push(`/track/${track.slug}`)}>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-mym-text text-sm font-semibold" numberOfLines={1}>
                        {track.title}
                      </Text>
                      <View className={`flex-row items-center gap-0.5 px-1.5 py-0.5 rounded ${track.isPublic ? 'bg-green-900/30' : 'bg-amber-900/30'}`}>
                        {track.isPublic ? (
                          <Globe size={9} color="#4ade80" />
                        ) : (
                          <LockKeyhole size={9} color="#fbbf24" />
                        )}
                        <Text className={`text-[10px] font-medium ${track.isPublic ? 'text-green-300' : 'text-amber-300'}`}>
                          {track.isPublic ? 'Public' : 'Private'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-mym-muted text-xs" numberOfLines={1}>
                      {track.agent?.name} · {track.playCount ?? 0} plays
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleVisibility(track)} className="p-2">
                    {track.isPublic ? (
                      <LockKeyhole size={16} color="#a1a1aa" />
                    ) : (
                      <Globe size={16} color="#a1a1aa" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTrack(track)} className="p-2">
                    <Trash2 size={16} color="#f87171" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Member since */}
        {user?.createdAt && (
          <View className="px-4 mt-4 flex-row items-center gap-2">
            <Calendar size={12} color="#71717a" />
            <Text className="text-mym-muted text-xs">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function QuickLink({ icon, label, onPress, primary }: { icon: any; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${primary ? 'bg-mym-accent/20 border border-mym-accent/30' : 'bg-mym-card border border-mym-border'}`}
    >
      {icon}
      <Text className={`text-xs font-semibold ${primary ? 'text-mym-accent' : 'text-mym-text'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
