import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApi, debounce } from '@makeyourmusic/shared';
import type { TrackItem, Genre } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { AgentCard } from '../../components/agent/AgentCard';
import { Search as SearchIcon, X as XIcon } from 'lucide-react-native';
import { useTokens } from '../../lib/theme';

type Tab = 'tracks' | 'agents';

export default function SearchScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('tracks');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Fetch genres once for the filter row.
  useEffect(() => {
    getApi()
      .get('/genres')
      .then((r) => setGenres(r.data.genres || []))
      .catch(() => setGenres([]));
  }, []);

  const doSearch = useCallback(
    debounce(async (q: string, genreSlug: string) => {
      if (!q.trim() && !genreSlug) {
        setTracks([]);
        setAgents([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const api = getApi();
        const params: Record<string, string | number> = { limit: 20 };
        if (q) params.search = q;
        if (genreSlug) params.genre = genreSlug;
        const [tracksRes, agentsRes] = await Promise.all([
          api.get('/tracks', { params }),
          q
            ? api.get(`/agents?search=${encodeURIComponent(q)}&limit=20`)
            : Promise.resolve({ data: { agents: [] } }),
        ]);
        setTracks(tracksRes.data.tracks || []);
        setAgents(agentsRes.data.agents || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400),
    [],
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    doSearch(text, activeGenre);
  };

  const handleGenreChange = (slug: string) => {
    const next = activeGenre === slug ? '' : slug;
    setActiveGenre(next);
    doSearch(query, next);
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Search input */}
      <View className="px-4 pt-2 pb-3">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tokens.card,
            borderWidth: 1,
            borderColor: tokens.border,
            borderRadius: tokens.radiusLg,
            paddingHorizontal: 14,
          }}
        >
          <SearchIcon size={18} color={tokens.textMute} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, paddingVertical: 12, color: tokens.text, fontSize: 15 }}
            placeholder="Search tracks, agents…"
            placeholderTextColor={tokens.textMute}
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')} accessibilityLabel="Clear search">
              <XIcon size={16} color={tokens.textMute} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Genre filter chips — always present so guests can browse without typing */}
      {genres.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ marginBottom: 12 }}
        >
          <TouchableOpacity
            onPress={() => handleGenreChange('')}
            style={{
              marginRight: 8,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: !activeGenre ? tokens.brand : tokens.card,
              borderWidth: 1,
              borderColor: !activeGenre ? tokens.brand : tokens.border,
            }}
          >
            <Text style={{ color: !activeGenre ? '#fff' : tokens.textMute, fontSize: 12, fontWeight: '600' }}>
              All
            </Text>
          </TouchableOpacity>
          {genres.map((g) => {
            const active = activeGenre === g.slug;
            return (
              <TouchableOpacity
                key={g.id || g.slug}
                onPress={() => handleGenreChange(g.slug)}
                style={{
                  marginRight: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: active ? tokens.brand : tokens.card,
                  borderWidth: 1,
                  borderColor: active ? tokens.brand : tokens.border,
                }}
              >
                <Text style={{ color: active ? '#fff' : tokens.textMute, fontSize: 12, fontWeight: '600' }}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Tabs */}
      {searched && (
        <View className="flex-row px-4 mb-3">
          <TouchableOpacity
            onPress={() => setTab('tracks')}
            style={{
              marginRight: 10,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: tab === 'tracks' ? tokens.brand : tokens.card,
              borderWidth: 1,
              borderColor: tab === 'tracks' ? tokens.brand : tokens.border,
            }}
          >
            <Text style={{ color: tab === 'tracks' ? '#fff' : tokens.textMute, fontSize: 13, fontWeight: '600' }}>
              Tracks{tracks.length > 0 ? ` · ${tracks.length}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('agents')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: tab === 'agents' ? tokens.brand : tokens.card,
              borderWidth: 1,
              borderColor: tab === 'agents' ? tokens.brand : tokens.border,
            }}
          >
            <Text style={{ color: tab === 'agents' ? '#fff' : tokens.textMute, fontSize: 13, fontWeight: '600' }}>
              Agents{agents.length > 0 ? ` · ${agents.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={tokens.brand} />
        </View>
      ) : !searched ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
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
            <SearchIcon size={24} color={tokens.brand} />
          </View>
          <Text style={{ color: tokens.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
            Search for tracks & agents
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, textAlign: 'center' }}>
            Type a song, artist style, or vibe — or pick a genre above to browse.
          </Text>
        </View>
      ) : tab === 'tracks' ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackRow track={item} queue={tracks} index={index} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: tokens.textMute, fontSize: 14 }}>No tracks found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{ paddingHorizontal: 16, marginBottom: 16 }}
          renderItem={({ item }) => <AgentCard agent={item} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: tokens.textMute, fontSize: 14 }}>No agents found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        />
      )}
    </ScreenContainer>
  );
}
