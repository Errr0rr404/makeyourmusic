import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getApi } from '@makeyourmusic/shared';
import type { TrackItem } from '@makeyourmusic/shared';
import { TrackRow } from '../../components/track/TrackRow';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GenreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [genreName, setGenreName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenreTracks();
  }, [slug]);

  const fetchGenreTracks = async () => {
    try {
      const api = getApi();
      const res = await api.get(`/tracks?genre=${slug}&limit=50`);
      setTracks(res.data.tracks || []);
      // Derive genre name from slug
      setGenreName(
        slug
          ? slug
              .split('-')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          : 'Genre',
      );
    } catch (err) {
      console.error('Genre fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fafafa',
          headerTitle: genreName,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fafafa" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView className="flex-1 bg-morlo-bg" edges={[]}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
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
                <Text className="text-morlo-muted">No tracks in this genre yet</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        )}
      </SafeAreaView>
    </>
  );
}
