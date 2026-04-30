import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import type { TrackItem, Playlist } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { Library as LibraryIcon, Heart, ListMusic, Plus, X, Clock, Sparkles } from 'lucide-react-native';
import { useTokens } from '../../lib/theme';

type Tab = 'liked' | 'history' | 'foryou' | 'playlists';

export default function LibraryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const tokens = useTokens();
  const [tab, setTab] = useState<Tab>('liked');
  const [likedTracks, setLikedTracks] = useState<TrackItem[]>([]);
  const [historyTracks, setHistoryTracks] = useState<TrackItem[]>([]);
  const [forYouTracks, setForYouTracks] = useState<TrackItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLibrary = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const api = getApi();
      const [likesRes, playlistsRes, historyRes, forYouRes] = await Promise.allSettled([
        api.get('/social/likes'),
        api.get('/social/playlists/mine'),
        api.get('/tracks/history?limit=30'),
        api.get('/tracks/recommendations?limit=20'),
      ]);
      const ok = <T,>(r: PromiseSettledResult<{ data: T }>) =>
        r.status === 'fulfilled' ? r.value.data : null;
      setLikedTracks((ok(likesRes) as any)?.tracks || []);
      setPlaylists((ok(playlistsRes) as any)?.playlists || []);
      setHistoryTracks((ok(historyRes) as any)?.tracks || []);
      setForYouTracks((ok(forYouRes) as any)?.tracks || []);
    } catch (err) {
      console.error('Library error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleCreatePlaylist = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const api = getApi();
      const res = await api.post('/social/playlists', { title });
      const created = res.data.playlist as Playlist;
      setPlaylists((prev) => [{ ...created, _count: { tracks: 0 } } as Playlist, ...prev]);
      setShowCreate(false);
      setNewTitle('');
      setTab('playlists');
    } catch (err: any) {
      Alert.alert('Could not create playlist', err?.response?.data?.error || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center px-8 pt-32">
          <LibraryIcon size={48} color={tokens.textMute} />
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
            Your Library
          </Text>
          <Text style={{ color: tokens.textMute, textAlign: 'center', marginBottom: 24 }}>
            Sign in to access your liked songs, history, and playlists.
          </Text>
          <Button title="Sign In" onPress={() => router.push('/(auth)/login')} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  const TABS: { id: Tab; label: string; icon: typeof Heart; count: number }[] = [
    { id: 'liked', label: 'Liked', icon: Heart, count: likedTracks.length },
    { id: 'history', label: 'History', icon: Clock, count: historyTracks.length },
    { id: 'foryou', label: 'For you', icon: Sparkles, count: forYouTracks.length },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, count: playlists.length },
  ];

  const activeData =
    tab === 'liked' ? likedTracks
    : tab === 'history' ? historyTracks
    : tab === 'foryou' ? forYouTracks
    : [];

  const emptyMessages: Record<Tab, { title: string; body: string; icon: typeof Heart }> = {
    liked: { title: 'No liked songs yet', body: 'Tap the heart on any track to save it here.', icon: Heart },
    history: { title: 'No listening history yet', body: 'Play a few tracks and they’ll show up here.', icon: Clock },
    foryou: { title: 'We’re still learning your taste', body: 'Like a few tracks for tailored picks.', icon: Sparkles },
    playlists: { title: 'No playlists yet', body: 'Tap “New” above to make your first.', icon: ListMusic },
  };

  return (
    <ScreenContainer scrollable={false}>
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text
          style={{
            color: tokens.text,
            fontSize: 24,
            fontWeight: '800',
            fontFamily: tokens.isVintage ? tokens.fontDisplay : undefined,
            textTransform: tokens.isVintage ? 'uppercase' : undefined,
            letterSpacing: tokens.isVintage ? 1 : undefined,
          }}
        >
          Library
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tokens.brand,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
          accessibilityLabel="Create playlist"
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
        style={{ marginBottom: 12 }}
      >
        {TABS.map(({ id, label, icon: Icon, count }) => {
          const active = tab === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setTab(id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? tokens.brand : tokens.card,
                borderWidth: 1,
                borderColor: active ? tokens.brand : tokens.border,
              }}
              activeOpacity={0.8}
            >
              <Icon size={14} color={active ? '#fff' : tokens.textMute} />
              <Text
                style={{
                  marginLeft: 6,
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? '#fff' : tokens.textMute,
                }}
              >
                {label}
                {count > 0 ? ` · ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tab !== 'playlists' ? (
        <FlatList
          data={activeData}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          renderItem={({ item, index }) => (
            <TrackRow track={item} queue={activeData} index={index} />
          )}
          ListEmptyComponent={
            <LibraryEmpty info={emptyMessages[tab]} tokens={tokens} />
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlaylistRow playlist={item} tokens={tokens} onPress={() => router.push(`/playlist/${item.slug || item.id}`)} />
          )}
          ListEmptyComponent={
            <LibraryEmpty
              info={emptyMessages.playlists}
              tokens={tokens}
              cta={{
                label: 'Create your first playlist',
                onPress: () => setShowCreate(true),
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      )}

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <View
            style={{
              width: '100%',
              backgroundColor: tokens.card,
              borderRadius: tokens.radiusLg,
              padding: 20,
              borderWidth: 1,
              borderColor: tokens.border,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700' }}>New playlist</Text>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewTitle(''); }}
                accessibilityLabel="Close"
              >
                <X size={20} color={tokens.textMute} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="My new playlist"
              placeholderTextColor={tokens.textMute}
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreatePlaylist}
              style={{
                backgroundColor: tokens.bg,
                borderWidth: 1,
                borderColor: tokens.border,
                borderRadius: tokens.radiusMd,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: tokens.text,
                fontSize: 16,
              }}
            />
            <View className="flex-row justify-end mt-4 gap-2">
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewTitle(''); }}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}
              >
                <Text style={{ color: tokens.textMute, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                disabled={!newTitle.trim() || creating}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: !newTitle.trim() || creating ? tokens.brand + '66' : tokens.brand,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {creating ? 'Creating…' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

function LibraryEmpty({
  info,
  tokens,
  cta,
}: {
  info: { title: string; body: string; icon: typeof Heart };
  tokens: ReturnType<typeof useTokens>;
  cta?: { label: string; onPress: () => void };
}) {
  const Icon = info.icon;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: tokens.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={24} color={tokens.brand} />
      </View>
      <Text style={{ color: tokens.text, fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
        {info.title}
      </Text>
      <Text style={{ color: tokens.textMute, fontSize: 13, textAlign: 'center', maxWidth: 260, marginBottom: 16 }}>
        {info.body}
      </Text>
      {cta && (
        <TouchableOpacity
          onPress={cta.onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tokens.brand,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 999,
          }}
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 6 }}>{cta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PlaylistRow({
  playlist,
  tokens,
  onPress,
}: {
  playlist: Playlist;
  tokens: ReturnType<typeof useTokens>;
  onPress: () => void;
}) {
  // Surface the first few track covers so playlists look real, not generic.
  const previewCovers: string[] = [];
  if ((playlist as any).tracks?.length) {
    for (const item of (playlist as any).tracks as { track?: { coverArt?: string | null } }[]) {
      const cover = item?.track?.coverArt;
      if (cover && !previewCovers.includes(cover)) previewCovers.push(cover);
      if (previewCovers.length >= 4) break;
    }
  }
  const trackCount = playlist._count?.tracks ?? 0;

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: tokens.radiusMd,
          backgroundColor: tokens.cardHover,
          marginRight: 12,
          overflow: 'hidden',
        }}
      >
        {playlist.coverArt ? (
          <Image source={{ uri: playlist.coverArt }} style={{ width: '100%', height: '100%' }} />
        ) : previewCovers.length >= 2 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' }}>
            {[0, 1, 2, 3].map((i) => {
              const url = previewCovers[i] ?? previewCovers[i % previewCovers.length];
              return url ? (
                <Image key={i} source={{ uri: url }} style={{ width: '50%', height: '50%' }} />
              ) : (
                <View key={i} style={{ width: '50%', height: '50%', backgroundColor: tokens.brand, opacity: 0.4 }} />
              );
            })}
          </View>
        ) : previewCovers[0] ? (
          <Image source={{ uri: previewCovers[0] }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.accentSoft }}>
            <ListMusic size={22} color={tokens.brand} />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
          {playlist.title}
        </Text>
        <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 2 }}>
          {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
