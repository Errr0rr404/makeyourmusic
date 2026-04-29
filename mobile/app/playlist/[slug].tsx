import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, ListMusic, Globe, Lock, Play, Pencil, Trash2, Music,
  AlertCircle,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';

interface Track {
  id: string;
  title: string;
  slug: string;
  coverArt: string | null;
  duration: number;
  agent: { id: string; name: string; slug: string };
}

interface Playlist {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  user: { id: string; username: string; displayName: string | null };
  tracks: Array<{ track: Track }>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getApi().get(`/social/playlists/${slug}`);
      setPlaylist(res.data.playlist);
      setEditTitle(res.data.playlist?.title || '');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Playlist not found');
      } else {
        setError(err.response?.data?.error || 'Failed to load playlist');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isOwner = !!(user?.id && playlist && playlist.userId === user.id);
  const tracks: Track[] = (playlist?.tracks || []).map((pt) => pt.track);

  const handlePlayAll = () => {
    if (tracks.length > 0 && tracks[0]) {
      playTrack(tracks[0] as any, tracks as any);
      hapticSelection();
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || !playlist) return;
    setSaving(true);
    try {
      await getApi().put(`/social/playlists/${playlist.id}`, { title: editTitle.trim() });
      setPlaylist((p) => (p ? { ...p, title: editTitle.trim() } : p));
      setEditing(false);
      hapticSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not update playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!playlist) return;
    const next = !playlist.isPublic;
    setPlaylist({ ...playlist, isPublic: next });
    try {
      await getApi().put(`/social/playlists/${playlist.id}`, { isPublic: next });
      hapticSelection();
    } catch {
      setPlaylist({ ...playlist, isPublic: !next });
      Alert.alert('Error', 'Could not update visibility');
    }
  };

  const handleDelete = () => {
    if (!playlist) return;
    Alert.alert(
      `Delete "${playlist.title}"?`,
      'Tracks in the playlist will not be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await getApi().delete(`/social/playlists/${playlist.id}`);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Could not delete');
            }
          },
        },
      ]
    );
  };

  const handleRemoveTrack = async (track: Track) => {
    if (!playlist) return;
    Alert.alert('Remove track?', `Remove "${track.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await getApi().delete(`/social/playlists/${playlist.id}/tracks/${track.id}`);
            setPlaylist((p) =>
              p
                ? {
                    ...p,
                    tracks: p.tracks.filter((pt) => pt.track.id !== track.id),
                  }
                : p
            );
          } catch {
            Alert.alert('Error', 'Could not remove track');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !playlist) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={40} color="#f87171" />
          <Text className="text-morlo-text text-lg font-bold mt-3">{error || 'Playlist not found'}</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-morlo-accent text-sm font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false}>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3">
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={20} color="#a1a1aa" />
              </TouchableOpacity>
              {isOwner && !editing && (
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleToggleVisibility}
                    className="p-2 rounded-full bg-morlo-card"
                  >
                    {playlist.isPublic ? (
                      <Globe size={18} color="#4ade80" />
                    ) : (
                      <Lock size={18} color="#fbbf24" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditing(true)}
                    className="p-2 rounded-full bg-morlo-card"
                  >
                    <Pencil size={18} color="#a1a1aa" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} className="p-2 rounded-full bg-red-900/20">
                    <Trash2 size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Cover + title */}
            <View className="items-center px-6 py-6">
              <View className="w-40 h-40 rounded-2xl bg-gradient-to-br from-purple-800 to-pink-800 items-center justify-center overflow-hidden">
                <ListMusic size={56} color="#8b5cf6" />
              </View>

              {editing ? (
                <View className="w-full mt-5">
                  <Input
                    value={editTitle}
                    onChangeText={setEditTitle}
                    maxLength={100}
                    autoFocus
                  />
                  <View className="flex-row gap-2 justify-center">
                    <TouchableOpacity
                      onPress={() => {
                        setEditing(false);
                        setEditTitle(playlist.title);
                      }}
                      className="px-4 py-2"
                    >
                      <Text className="text-morlo-muted text-sm">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveTitle}
                      disabled={saving}
                      className="px-4 py-2 bg-morlo-accent rounded-lg"
                    >
                      <Text className="text-white text-sm font-semibold">{saving ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text className="text-xs text-morlo-muted uppercase font-bold mt-4">Playlist</Text>
                  <Text className="text-morlo-text text-2xl font-bold mt-1">{playlist.title}</Text>
                  <Text className="text-morlo-muted text-sm mt-1">
                    {playlist.user?.displayName || playlist.user?.username} · {tracks.length} track
                    {tracks.length !== 1 ? 's' : ''}
                  </Text>
                  <View
                    className={`flex-row items-center gap-1 mt-2 px-2 py-0.5 rounded-full ${playlist.isPublic ? 'bg-green-900/30' : 'bg-amber-900/30'}`}
                  >
                    {playlist.isPublic ? (
                      <Globe size={11} color="#4ade80" />
                    ) : (
                      <Lock size={11} color="#fbbf24" />
                    )}
                    <Text className={`text-xs ${playlist.isPublic ? 'text-green-300' : 'text-amber-300'}`}>
                      {playlist.isPublic ? 'Public' : 'Private'}
                    </Text>
                  </View>
                </>
              )}

              {tracks.length > 0 && !editing && (
                <TouchableOpacity
                  onPress={handlePlayAll}
                  className="mt-5 flex-row items-center gap-2 bg-morlo-accent px-6 py-3 rounded-full"
                >
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text className="text-white font-semibold">Play all</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="py-12 items-center px-6">
            <Music size={36} color="#71717a" />
            <Text className="text-morlo-muted text-sm mt-3 text-center">
              This playlist is empty
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/search')}
              className="mt-4 px-5 py-2 rounded-full bg-morlo-card border border-morlo-border"
            >
              <Text className="text-morlo-accent text-sm font-semibold">Find tracks to add</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => playTrack(item as any, tracks as any)}
            onLongPress={isOwner ? () => handleRemoveTrack(item) : undefined}
            className="flex-row items-center gap-3 px-4 py-2 active:bg-white/5"
          >
            <Text className="text-morlo-muted text-xs w-6 text-right">{index + 1}</Text>
            <View className="w-10 h-10 rounded bg-morlo-card overflow-hidden">
              {item.coverArt ? (
                <Image source={{ uri: item.coverArt }} className="w-full h-full" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Music size={14} color="#71717a" />
                </View>
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-morlo-text text-sm font-semibold" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-morlo-muted text-xs" numberOfLines={1}>
                {item.agent?.name}
              </Text>
            </View>
            <Text className="text-morlo-muted text-xs">{formatDuration(item.duration)}</Text>
            {isOwner && (
              <TouchableOpacity onPress={() => handleRemoveTrack(item)} className="p-2">
                <Trash2 size={14} color="#a1a1aa" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}
