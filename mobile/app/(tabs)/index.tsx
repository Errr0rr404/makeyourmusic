import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Bell, Play, Sparkles, Wand2 } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const [trending, setTrending] = useState<TrackItem[]>([]);
  const [latest, setLatest] = useState<TrackItem[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);
  const displayName = user?.displayName || user?.username || 'there';

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
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-2 pb-2">
        <View className="flex-1 pr-3">
          <Text
            style={{
              color: tokens.textMute,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: isVintage ? 1.5 : 0.5,
              textTransform: isVintage ? 'uppercase' : 'none',
              fontFamily: isVintage ? tokens.fontLabel : undefined,
              marginBottom: 4,
            }}
          >
            {isAuthenticated ? `${greeting},` : 'MakeYourMusic'}
          </Text>
          <Text
            style={{
              color: tokens.text,
              fontSize: 28,
              fontWeight: '800',
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : 'none',
              letterSpacing: isVintage ? 1 : -0.5,
            }}
            numberOfLines={1}
          >
            {isAuthenticated ? displayName : 'Sound that writes itself'}
          </Text>
        </View>
        {isAuthenticated && (
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={{
              position: 'relative',
              padding: 10,
              borderRadius: tokens.radiusLg,
              backgroundColor: tokens.card,
              borderWidth: 1,
              borderColor: tokens.border,
            }}
            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={20} color={tokens.textMute} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: tokens.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Hero card — guests get a sign-up CTA, members get a quick generate prompt */}
      <View className="px-4 pb-4">
        {!isAuthenticated ? (
          <View
            style={{
              borderRadius: tokens.radiusLg,
              padding: 20,
              backgroundColor: tokens.card,
              borderWidth: 1,
              borderColor: tokens.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: tokens.brand,
                opacity: 0.18,
              }}
            />
            <Text style={{ color: tokens.textSoft, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              Discover tracks crafted by AI agents.
            </Text>
            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={{
                  flex: 1,
                  backgroundColor: tokens.brand,
                  paddingVertical: 12,
                  borderRadius: tokens.radiusLg,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                activeOpacity={0.85}
              >
                <Sparkles size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Sign up free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  paddingVertical: 12,
                  borderRadius: tokens.radiusLg,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: tokens.border,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: tokens.text, fontWeight: '600' }}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/create')}
            style={{
              borderRadius: tokens.radiusLg,
              padding: 16,
              backgroundColor: tokens.accentSoft,
              borderWidth: 1,
              borderColor: tokens.brand + '33',
              flexDirection: 'row',
              alignItems: 'center',
            }}
            activeOpacity={0.85}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: tokens.brand,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                shadowColor: tokens.brand,
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <Wand2 size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tokens.text, fontWeight: '700', fontSize: 14 }}>
                {isVintage ? 'Cut a new track' : 'Tell us a vibe'}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>
                Generate a song with AI in 60 seconds.
              </Text>
            </View>
            <Play size={18} color={tokens.brand} fill={tokens.brand} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error state */}
      {error && (
        <View className="mx-4 mb-4 p-4 bg-rose-900/20 border border-rose-500/30 rounded-xl">
          <Text className="text-rose-400 text-sm text-center">{error}</Text>
          <TouchableOpacity onPress={fetchData} className="mt-2 items-center">
            <Text style={{ color: tokens.brand, fontWeight: '600', fontSize: 14 }}>Tap to retry</Text>
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
            {genres.map((genre) => {
              const genreColor = (genre as any).color || tokens.brand;
              return (
                <TouchableOpacity
                  key={genre.id || genre.slug}
                  onPress={() => router.push(`/genre/${genre.slug}`)}
                  style={{
                    marginRight: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: tokens.radiusLg,
                    backgroundColor: tokens.card,
                    borderWidth: 1,
                    borderColor: tokens.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: genreColor,
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ color: tokens.text, fontSize: 14, fontWeight: '600' }}>
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
