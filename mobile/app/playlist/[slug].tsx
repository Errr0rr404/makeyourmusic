import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore, usePlayerStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, ListMusic, Globe, Lock, Play, Pencil, Trash2, Music,
  AlertCircle,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Input } from '../../components/ui/Input';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';
import { asSlug } from '../../lib/validateSlug';
import { useTokens, useIsVintage } from '../../lib/theme';

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
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { user } = useAuthStore();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const safeSlug = asSlug(slug);
    if (!safeSlug) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getApi().get(`/social/playlists/${safeSlug}`);
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

  // Build a 2x2 mosaic from the first few tracks for the cover.
  const mosaicCovers = (() => {
    const out: string[] = [];
    for (const t of tracks) {
      if (t.coverArt && !out.includes(t.coverArt)) out.push(t.coverArt);
      if (out.length >= 4) break;
    }
    return out;
  })();

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.brand} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !playlist) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <AlertCircle size={40} color="#f87171" />
          <Text style={{ color: tokens.text, fontSize: 17, fontWeight: '700', marginTop: 12 }}>
            {error || 'Playlist not found'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }} accessibilityRole="button">
            <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>← Back</Text>
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={6}>
                <ArrowLeft size={20} color={tokens.textMute} />
              </TouchableOpacity>
              {isOwner && !editing && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleToggleVisibility}
                    style={{ padding: 8, borderRadius: 999, backgroundColor: tokens.card }}
                    accessibilityRole="button"
                    accessibilityLabel={playlist.isPublic ? 'Make private' : 'Make public'}
                  >
                    {playlist.isPublic ? (
                      <Globe size={18} color="#4ade80" />
                    ) : (
                      <Lock size={18} color="#fbbf24" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditing(true)}
                    style={{ padding: 8, borderRadius: 999, backgroundColor: tokens.card }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit title"
                  >
                    <Pencil size={18} color={tokens.textMute} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={{
                      padding: 8,
                      borderRadius: 999,
                      backgroundColor: 'rgba(248, 113, 113, 0.16)',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete playlist"
                  >
                    <Trash2 size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Cover + title */}
            <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 24 }}>
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: isVintage ? tokens.radiusLg : 20,
                  backgroundColor: tokens.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: tokens.isDark ? 0.4 : 0.15,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }}
              >
                {mosaicCovers.length >= 2 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' }}>
                    {[0, 1, 2, 3].map((i) => {
                      const url = mosaicCovers[i] ?? mosaicCovers[i % mosaicCovers.length];
                      return url ? (
                        <Image
                          key={i}
                          source={{ uri: url }}
                          style={{ width: '50%', height: '50%' }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View
                          key={i}
                          style={{ width: '50%', height: '50%', backgroundColor: tokens.brand, opacity: 0.4 }}
                        />
                      );
                    })}
                  </View>
                ) : mosaicCovers[0] ? (
                  <Image
                    source={{ uri: mosaicCovers[0] }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <ListMusic size={56} color={tokens.brand} />
                )}
              </View>

              {editing ? (
                <View style={{ width: '100%', marginTop: 20 }}>
                  <Input
                    value={editTitle}
                    onChangeText={setEditTitle}
                    maxLength={100}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditing(false);
                        setEditTitle(playlist.title);
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 8 }}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: tokens.textMute, fontSize: 13 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveTitle}
                      disabled={saving}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: tokens.brand,
                        borderRadius: tokens.radiusMd,
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: tokens.brandText, fontSize: 13, fontWeight: '600' }}>
                        {saving ? 'Saving…' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text
                    style={{
                      color: tokens.textMute,
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      marginTop: 16,
                      fontFamily: isVintage ? tokens.fontLabel : undefined,
                    }}
                  >
                    Playlist
                  </Text>
                  <Text
                    style={{
                      color: tokens.text,
                      fontSize: 24,
                      fontWeight: '700',
                      marginTop: 4,
                      fontFamily: isVintage ? tokens.fontDisplay : undefined,
                    }}
                  >
                    {playlist.title}
                  </Text>
                  <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }}>
                    {playlist.user?.displayName || playlist.user?.username} · {tracks.length} track
                    {tracks.length !== 1 ? 's' : ''}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: playlist.isPublic ? 'rgba(74, 222, 128, 0.16)' : 'rgba(251, 191, 36, 0.16)',
                    }}
                  >
                    {playlist.isPublic ? (
                      <Globe size={11} color="#4ade80" />
                    ) : (
                      <Lock size={11} color="#fbbf24" />
                    )}
                    <Text style={{ fontSize: 11, color: playlist.isPublic ? '#86efac' : '#fcd34d' }}>
                      {playlist.isPublic ? 'Public' : 'Private'}
                    </Text>
                  </View>
                </>
              )}

              {tracks.length > 0 && !editing && (
                <TouchableOpacity
                  onPress={handlePlayAll}
                  style={{
                    marginTop: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: tokens.brand,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 999,
                    shadowColor: tokens.brand,
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Play all tracks"
                >
                  <Play size={16} color={tokens.brandText} fill={tokens.brandText} />
                  <Text style={{ color: tokens.brandText, fontWeight: '600' }}>Play all</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
            <Music size={36} color={tokens.textMute} />
            <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              This playlist is empty
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/search')}
              style={{
                marginTop: 16,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              accessibilityRole="button"
            >
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>Find tracks to add</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => playTrack(item as any, tracks as any)}
            onLongPress={isOwner ? () => handleRemoveTrack(item) : undefined}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Play ${item.title}`}
          >
            <Text
              style={{
                color: tokens.textMute,
                fontSize: 11,
                width: 24,
                textAlign: 'right',
                fontFamily: isVintage ? tokens.fontMono : undefined,
              }}
            >
              {index + 1}
            </Text>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: isVintage ? tokens.radiusSm : 6,
                backgroundColor: tokens.card,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.coverArt ? (
                <Image
                  source={{ uri: item.coverArt }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={item.id}
                />
              ) : (
                <Music size={14} color={tokens.textMute} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                {item.agent?.name}
              </Text>
            </View>
            <Text
              style={{
                color: tokens.textMute,
                fontSize: 11,
                fontFamily: isVintage ? tokens.fontMono : undefined,
              }}
            >
              {formatDuration(item.duration)}
            </Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => handleRemoveTrack(item)}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Remove from playlist"
              >
                <Trash2 size={14} color={tokens.textMute} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}
