import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { TrackRow } from '../../components/track/TrackRow';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { asSlug } from '../../lib/validateSlug';
import { useTokens } from '../../lib/theme';

export default function GenreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const tokens = useTokens();

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [genreName, setGenreName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safeSlug = asSlug(slug);
    if (!safeSlug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const api = getApi();
        const res = await api.get(`/tracks?genre=${safeSlug}&limit=50`);
        if (cancelled) return;
        setTracks(res.data.tracks || []);
        setGenreName(
          safeSlug
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        );
      } catch (err) {
        if (!cancelled) console.error('Genre fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerTitle: genreName,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2" accessibilityLabel="Go back" accessibilityRole="button">
              <ArrowLeft size={24} color={tokens.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView className="flex-1 bg-mym-bg" edges={['top']}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={tokens.accent} />
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TrackRow track={item} queue={tracks} index={index} />
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-mym-muted">No tracks in this genre yet</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        )}
      </SafeAreaView>
    </>
  );
}
