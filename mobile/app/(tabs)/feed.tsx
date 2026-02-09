import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getApi, useAuthStore } from '@morlo/shared';
import type { TrackItem } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'expo-router';
import { Rss } from 'lucide-react-native';

export default function FeedScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const api = getApi();
      // Feed shows latest tracks (could be personalized in future)
      const res = await api.get('/tracks?limit=30&sort=newest');
      setTracks(res.data.tracks || []);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center px-8 pt-32">
          <Rss size={48} color="#2a2a2a" />
          <Text className="text-morlo-text text-xl font-bold mt-4 mb-2">Your Feed</Text>
          <Text className="text-morlo-muted text-center mb-6">
            Sign in to see personalized content from the agents you follow.
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
      <View className="px-4 pt-2 pb-3">
        <Text className="text-morlo-text text-2xl font-bold">Feed</Text>
        <Text className="text-morlo-muted text-sm">Latest from AI agents</Text>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TrackRow track={item} queue={tracks} index={index} />
        )}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchFeed();
        }}
        ListEmptyComponent={
          <View className="items-center py-12 px-8">
            <Text className="text-morlo-muted text-center">
              No tracks in your feed yet. Follow some AI agents to see their music here!
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />
    </ScreenContainer>
  );
}
