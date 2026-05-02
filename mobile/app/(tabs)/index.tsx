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
import { Logo } from '../../components/ui/Logo';
import { TouchableOpacity } from 'react-native';
import { Bell, Play, Wand2 } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';
import { ThemeQuickMenu } from '../../components/ThemeQuickMenu';

const QUICK_CREATE_PROMPTS = [
  'lo-fi focus track with warm vinyl texture',
  'cinematic synthwave for a night drive',
  'short pop hook about starting over',
];

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
  const hasDiscoveryContent = trending.length > 0 || latest.length > 0 || genres.length > 0 || agents.length > 0;
  const discoveryStats = [
    { label: 'Trending', value: trending.length, params: { sort: 'popular' } },
    { label: 'New', value: latest.length, params: { sort: 'newest' } },
    { label: 'Agents', value: agents.length, params: { tab: 'agents' } },
  ];

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
      <View className="flex-row items-center justify-between px-4 pt-2 pb-2">
        <View style={{ marginRight: 12 }}>
          <Logo size={isAuthenticated ? 32 : 40} />
        </View>
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
              // Authenticated users get a slightly smaller name so long handles
              // don't truncate aggressively next to the bell + theme buttons.
              fontSize: isAuthenticated ? 24 : 26,
              fontWeight: '800',
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : 'none',
              letterSpacing: isVintage ? 1 : -0.5,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {isAuthenticated ? displayName : 'Sound that writes itself'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              padding: 10,
              borderRadius: tokens.radiusLg,
              backgroundColor: tokens.card,
              borderWidth: 1,
              borderColor: tokens.border,
            }}
          >
            <ThemeQuickMenu />
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
      </View>

      {/* Hero card — guests get a sign-up CTA, members get a quick generate prompt */}
      <View className="px-4 pb-4">
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
              {isAuthenticated ? (isVintage ? 'Cut a new track' : 'Generate your next track') : 'Start with a prompt'}
            </Text>
            <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>
              Write, speak, or remix a prompt into a finished song.
            </Text>
          </View>
          <Play size={18} color={tokens.brand} fill={tokens.brand} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {QUICK_CREATE_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => router.push(`/create?prompt=${encodeURIComponent(prompt)}`)}
              style={{
                maxWidth: '100%',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ color: tokens.textSoft, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {discoveryStats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              onPress={() => router.push({ pathname: '/(tabs)/search', params: stat.params })}
              style={{
                flex: 1,
                minHeight: 54,
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: tokens.radiusLg,
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${stat.value} ${stat.label}`}
            >
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 17,
                  fontWeight: '800',
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  letterSpacing: isVintage ? 0.6 : 0,
                }}
              >
                {stat.value}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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

      {!error && !hasDiscoveryContent && (
        <View className="mx-4 mb-6 p-5 rounded-xl border border-mym-border bg-mym-card">
          <Text className="text-mym-text text-base font-bold text-center">Start your library</Text>
          <Text className="text-mym-muted text-sm text-center mt-1">
            Generate a first track, then come back here for new releases, agents, and genres.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/create')}
            className="mt-4 h-11 rounded-xl items-center justify-center bg-mym-accent"
            accessibilityRole="button"
            accessibilityLabel="Create a track"
          >
            <Text className="text-white text-sm font-semibold">Create a track</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <View className="mb-6">
          <SectionHeader
            title="Trending Now"
            subtitle="What listeners are replaying"
            onSeeAll={() => router.push('/search?sort=popular')}
          />
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
          <SectionHeader
            title="Popular AI Agents"
            subtitle="Creators with active catalogs"
            onSeeAll={() => router.push('/search?tab=agents')}
          />
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
          <SectionHeader title="Browse by Genre" subtitle="Jump into a sound" />
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
          <SectionHeader
            title="Latest Releases"
            subtitle="Freshly published tracks"
            onSeeAll={() => router.push('/search?sort=newest')}
          />
          {latest.map((track, i) => (
            <TrackRow key={track.id} track={track} queue={latest} index={i} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
