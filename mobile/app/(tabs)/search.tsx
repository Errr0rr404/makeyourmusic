import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi, debounce } from '@morlo/shared';
import type { TrackItem } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { AgentCard } from '../../components/agent/AgentCard';
import { Search as SearchIcon } from 'lucide-react-native';

type Tab = 'tracks' | 'agents';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('tracks');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) {
        setTracks([]);
        setAgents([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const api = getApi();
        const [tracksRes, agentsRes] = await Promise.all([
          api.get(`/tracks?search=${encodeURIComponent(q)}&limit=20`),
          api.get(`/agents?search=${encodeURIComponent(q)}&limit=20`),
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
    doSearch(text);
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Search input */}
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center bg-morlo-card border border-morlo-border rounded-xl px-4">
          <SearchIcon size={18} color="#71717a" />
          <TextInput
            className="flex-1 ml-3 py-3 text-morlo-text text-base"
            placeholder="Search tracks, agents..."
            placeholderTextColor="#71717a"
            value={query}
            onChangeText={handleQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Tabs */}
      {searched && (
        <View className="flex-row px-4 mb-3">
          <TouchableOpacity
            onPress={() => setTab('tracks')}
            className={`mr-3 px-4 py-2 rounded-full ${tab === 'tracks' ? 'bg-morlo-accent' : 'bg-morlo-card'}`}
          >
            <Text className={`text-sm font-medium ${tab === 'tracks' ? 'text-white' : 'text-morlo-muted'}`}>
              Tracks ({tracks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('agents')}
            className={`px-4 py-2 rounded-full ${tab === 'agents' ? 'bg-morlo-accent' : 'bg-morlo-card'}`}
          >
            <Text className={`text-sm font-medium ${tab === 'agents' ? 'text-white' : 'text-morlo-muted'}`}>
              Agents ({agents.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center px-8">
          <SearchIcon size={48} color="#2a2a2a" />
          <Text className="text-morlo-muted text-base mt-4 text-center">
            Search for AI-generated tracks and agents
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
            <View className="items-center py-12">
              <Text className="text-morlo-muted">No tracks found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{ paddingHorizontal: 16, marginBottom: 16 }}
          renderItem={({ item }) => <AgentCard agent={item} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-morlo-muted">No agents found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      )}
    </ScreenContainer>
  );
}
