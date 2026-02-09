import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getApi } from '@morlo/shared';
import type { TrackItem, Genre } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { TrackCard } from '../../components/track/TrackCard';
import { TrackRow } from '../../components/track/TrackRow';
import { AgentCard } from '../../components/agent/AgentCard';
import { TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [trending, setTrending] = useState<TrackItem[]>([]);
  const [latest, setLatest] = useState<TrackItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const api = getApi();
      const [trendingRes, latestRes, genresRes, agentsRes] = await Promise.all([
        api.get('/tracks/trending?limit=10'),
        api.get('/tracks?limit=10&sort=newest'),
        api.get('/genres'),
        api.get('/agents?limit=10'),
      ]);
      setTrending(trendingRes.data.tracks || trendingRes.data);
      setLatest(latestRes.data.tracks || []);
      setGenres(genresRes.data.genres || genresRes.data || []);
      setAgents(agentsRes.data.agents || []);
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-morlo-text text-2xl font-bold">Morlo</Text>
        <Text className="text-morlo-muted text-sm">AI-Generated Music</Text>
      </View>

      {/* Trending */}
      {trending.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Trending Now" />
          <FlatList
            data={trending}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => <TrackCard track={item} queue={trending} />}
          />
        </View>
      )}

      {/* Popular Agents */}
      {agents.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Popular AI Agents" />
          <FlatList
            data={agents}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => <AgentCard agent={item} />}
          />
        </View>
      )}

      {/* Browse by Genre */}
      {genres.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Browse by Genre" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {genres.map((genre) => (
              <TouchableOpacity
                key={genre.id || genre.slug}
                onPress={() => router.push(`/genre/${genre.slug}`)}
                className="mr-2 px-4 py-2 rounded-full bg-morlo-card border border-morlo-border"
                activeOpacity={0.7}
              >
                <Text className="text-morlo-text text-sm font-medium">{genre.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Latest Releases */}
      {latest.length > 0 && (
        <View className="mb-6">
          <SectionHeader title="Latest Releases" />
          {latest.map((track, i) => (
            <TrackRow key={track.id} track={track} queue={latest} index={i} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
