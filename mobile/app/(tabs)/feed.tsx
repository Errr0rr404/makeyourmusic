import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApi, useAuthStore } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'expo-router';
import { Rss } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function FeedScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const api = getApi();
      const res = await api.get('/tracks?limit=30&sort=newest');
      setTracks(res.data.tracks || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load feed');
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top + 48 }}>
          <Rss size={48} color={tokens.borderStrong} />
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
            Your Feed
          </Text>
          <Text style={{ color: tokens.textMute, textAlign: 'center', marginBottom: 24, fontSize: 14, lineHeight: 20 }}>
            Sign in to see personalized content from the agents you follow.
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

  return (
    <ScreenContainer scrollable={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Text
          style={{
            color: tokens.text,
            fontSize: 24,
            fontWeight: '800',
            fontFamily: isVintage ? tokens.fontDisplay : undefined,
            textTransform: isVintage ? 'uppercase' : undefined,
            letterSpacing: isVintage ? 1 : undefined,
          }}
        >
          Feed
        </Text>
        <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 2 }}>Latest from AI agents</Text>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <TrackRow track={item} queue={tracks} index={index} />}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchFeed();
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
            {error ? (
              <>
                <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 12 }}>{error}</Text>
                <TouchableOpacity onPress={fetchFeed} accessibilityRole="button">
                  <Text style={{ color: tokens.accent, fontWeight: '600' }}>Tap to retry</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ color: tokens.textMute, textAlign: 'center', fontSize: 14 }}>
                No tracks in your feed yet. Follow some AI agents to see their music here!
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      />
    </ScreenContainer>
  );
}
