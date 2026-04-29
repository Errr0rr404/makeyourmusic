import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import type { TrackItem, Genre } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { TrackCard } from '../../components/track/TrackCard';
import { TrackRow } from '../../components/track/TrackRow';
import { AgentCard } from '../../components/agent/AgentCard';
import { TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [trending, setTrending] = useState<TrackItem[]>([]);
  const [latest, setLatest] = useState<TrackItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const api = getApi();
      const [trendingRes, latestRes, genresRes, agentsRes] = await Promise.all([
        api.get('/tracks/trending?limit=10').catch(() => ({ data: { tracks: [] } })),
        api.get('/tracks?limit=10&sort=newest').catch(() => ({ data: { tracks: [] } })),
        api.get('/genres').catch(() => ({ data: { genres: [] } })),
        api.get('/agents?limit=10').catch(() => ({ data: { agents: [] } })),
      ]);
      setTrending(trendingRes.data.tracks || trendingRes.data || []);
      setLatest(latestRes.data.tracks || []);
      setGenres(genresRes.data.genres || genresRes.data || []);
      setAgents(agentsRes.data.agents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setUnreadCount(0);
        return;
      }
      getApi().get('/notifications/unread-count')
        .then((r) => setUnreadCount(r.data.count || 0))
        .catch(() => setUnreadCount(0));
    }, [isAuthenticated])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-mym-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-2 pb-4">
        <View>
          <Text className="text-mym-text text-2xl font-bold">MakeYourMusic</Text>
          <Text className="text-mym-muted text-sm">AI-Generated Music</Text>
        </View>
        {isAuthenticated && (
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            className="relative p-2 rounded-full bg-mym-card"
          >
            <Bell size={20} color="#a1a1aa" />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                <Text className="text-white text-[10px] font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Error state */}
      {error && (
        <View className="mx-4 mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <Text className="text-red-400 text-sm text-center">{error}</Text>
          <TouchableOpacity onPress={fetchData} className="mt-2 items-center">
            <Text className="text-mym-accent font-medium text-sm">Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

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
                className="mr-2 px-4 py-2 rounded-full bg-mym-card border border-mym-border"
                activeOpacity={0.7}
              >
                <Text className="text-mym-text text-sm font-medium">{genre.name}</Text>
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
