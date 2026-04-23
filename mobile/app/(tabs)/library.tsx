import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi, useAuthStore } from '@morlo/shared';
import type { TrackItem, Playlist } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { Library as LibraryIcon, Heart, ListMusic, Plus, X } from 'lucide-react-native';

type Tab = 'liked' | 'playlists';

export default function LibraryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('liked');
  const [likedTracks, setLikedTracks] = useState<TrackItem[]>([]);
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
      const [likesRes, playlistsRes] = await Promise.all([
        api.get('/social/likes'),
        api.get('/social/playlists/mine'),
      ]);
      // Backend returns { tracks: [...] } with track data enriched with likedAt
      setLikedTracks(likesRes.data.tracks || []);
      setPlaylists(playlistsRes.data.playlists || []);
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
          <LibraryIcon size={48} color="#2a2a2a" />
          <Text className="text-morlo-text text-xl font-bold mt-4 mb-2">Your Library</Text>
          <Text className="text-morlo-muted text-center mb-6">
            Sign in to access your liked songs and playlists.
          </Text>
          <Button title="Sign In" onPress={() => router.push('/(auth)/login')} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScreenContainer scrollable={false}>
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <Text className="text-morlo-text text-2xl font-bold">Library</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          className="flex-row items-center bg-morlo-accent rounded-full px-3 py-1.5"
          accessibilityLabel="Create playlist"
        >
          <Plus size={14} color="#fff" />
          <Text className="text-white text-xs font-semibold ml-1">New playlist</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 mb-3">
        <TouchableOpacity
          onPress={() => setTab('liked')}
          className={`flex-row items-center mr-3 px-4 py-2 rounded-full ${tab === 'liked' ? 'bg-morlo-accent' : 'bg-morlo-card'}`}
        >
          <Heart size={14} color={tab === 'liked' ? '#fff' : '#a1a1aa'} />
          <Text className={`ml-2 text-sm font-medium ${tab === 'liked' ? 'text-white' : 'text-morlo-muted'}`}>
            Liked Songs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('playlists')}
          className={`flex-row items-center px-4 py-2 rounded-full ${tab === 'playlists' ? 'bg-morlo-accent' : 'bg-morlo-card'}`}
        >
          <ListMusic size={14} color={tab === 'playlists' ? '#fff' : '#a1a1aa'} />
          <Text className={`ml-2 text-sm font-medium ${tab === 'playlists' ? 'text-white' : 'text-morlo-muted'}`}>
            Playlists
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'liked' ? (
        <FlatList
          data={likedTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackRow track={item} queue={likedTracks} index={index} />
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Heart size={40} color="#2a2a2a" />
              <Text className="text-morlo-muted mt-3">No liked songs yet</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => router.push(`/playlist/${item.slug || item.id}`)}
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-lg bg-morlo-card items-center justify-center mr-3">
                <ListMusic size={24} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-morlo-text text-base font-semibold">{item.title}</Text>
                <Text className="text-morlo-muted text-sm">
                  {item._count?.tracks || 0} tracks
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-12 px-6">
              <ListMusic size={40} color="#2a2a2a" />
              <Text className="text-morlo-muted mt-3 mb-4">No playlists yet</Text>
              <TouchableOpacity
                onPress={() => setShowCreate(true)}
                className="flex-row items-center bg-morlo-accent rounded-full px-4 py-2"
              >
                <Plus size={14} color="#fff" />
                <Text className="text-white text-sm font-semibold ml-1.5">Create your first playlist</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      )}

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/70 items-center justify-center px-6"
        >
          <View className="w-full bg-morlo-card rounded-2xl p-5 border border-morlo-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-morlo-text text-lg font-bold">New playlist</Text>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewTitle(''); }}
                accessibilityLabel="Close"
              >
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="My new playlist"
              placeholderTextColor="#71717a"
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreatePlaylist}
              className="bg-morlo-bg border border-morlo-border rounded-xl px-4 py-3 text-morlo-text text-base"
            />
            <View className="flex-row justify-end mt-4 gap-2">
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewTitle(''); }}
                className="px-4 py-2 rounded-full"
              >
                <Text className="text-morlo-muted text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                disabled={!newTitle.trim() || creating}
                className={`px-4 py-2 rounded-full ${(!newTitle.trim() || creating) ? 'bg-morlo-accent/40' : 'bg-morlo-accent'}`}
              >
                <Text className="text-white text-sm font-semibold">
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
