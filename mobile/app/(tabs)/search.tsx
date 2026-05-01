import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApi, debounce } from '@makeyourmusic/shared';
import type { TrackItem, Genre } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { AgentCard } from '../../components/agent/AgentCard';
import {
  Search as SearchIcon,
  X as XIcon,
  SlidersHorizontal,
  ChevronDown,
  Music2,
  Bot,
} from 'lucide-react-native';
import { useTokens } from '../../lib/theme';

type Tab = 'tracks' | 'agents';
type Sort = 'newest' | 'popular' | 'liked';

const SORT_OPTIONS: Array<{ value: Sort; label: string }> = [
  { value: 'newest', label: 'New' },
  { value: 'popular', label: 'Played' },
  { value: 'liked', label: 'Liked' },
];

export default function SearchScreen() {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('tracks');
  const [sort, setSort] = useState<Sort>('newest');
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const activeGenreName = useMemo(
    () => genres.find((g) => g.slug === activeGenre)?.name || '',
    [genres, activeGenre],
  );
  const hasFilters = !!activeGenre || sort !== 'newest';
  const canShowAgents = query.trim().length > 0;

  // Fetch genres once for the filter row.
  useEffect(() => {
    getApi()
      .get('/genres')
      .then((r) => setGenres(r.data.genres || []))
      .catch(() => setGenres([]));
  }, []);

  const doSearch = useCallback(
    debounce(async (q: string, genreSlug: string, sortValue: Sort) => {
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
        params.sort = sortValue;
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
    if (!text.trim()) setTab('tracks');
    doSearch(text, activeGenre, sort);
  };

  const handleGenreChange = (slug: string) => {
    const next = activeGenre === slug ? '' : slug;
    setActiveGenre(next);
    setTab('tracks');
    doSearch(query, next, sort);
  };

  const handleSortChange = (next: Sort) => {
    setSort(next);
    setTab('tracks');
    doSearch(query, activeGenre, next);
  };

  const clearFilters = () => {
    setActiveGenre('');
    setSort('newest');
    setShowFilters(false);
    doSearch(query, '', 'newest');
  };

  return (
    <ScreenContainer scrollable={false}>
      <View className="px-4 pt-2 pb-2">
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: tokens.text, fontSize: 28, fontWeight: '800' }}>Search</Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 2 }}>
            Find tracks, agents, and moods.
          </Text>
        </View>

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

      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: tokens.card,
            borderRadius: tokens.radiusLg,
            borderWidth: 1,
            borderColor: tokens.border,
            padding: 4,
            marginBottom: 10,
          }}
        >
          {(['tracks', 'agents'] as Tab[]).map((item) => {
            const active = tab === item;
            const disabled = item === 'agents' && !canShowAgents;
            const Icon = item === 'tracks' ? Music2 : Bot;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => !disabled && setTab(item)}
                disabled={disabled}
                style={{
                  flex: 1,
                  minHeight: 38,
                  borderRadius: tokens.radiusMd,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  backgroundColor: active ? tokens.brand : 'transparent',
                  opacity: disabled ? 0.45 : 1,
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled }}
              >
                <Icon size={15} color={active ? tokens.brandText : tokens.textMute} />
                <Text
                  style={{
                    color: active ? tokens.brandText : tokens.textMute,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {item === 'tracks' ? 'Tracks' : 'Agents'}
                  {searched && item === 'tracks' && tracks.length > 0 ? ` · ${tracks.length}` : ''}
                  {searched && item === 'agents' && agents.length > 0 ? ` · ${agents.length}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setShowFilters((v) => !v)}
            style={{
              flex: 1,
              minHeight: 40,
              paddingHorizontal: 12,
              borderRadius: tokens.radiusMd,
              backgroundColor: showFilters || hasFilters ? tokens.accentSoft : tokens.card,
              borderWidth: 1,
              borderColor: showFilters || hasFilters ? tokens.accent : tokens.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open search filters"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <SlidersHorizontal size={15} color={showFilters || hasFilters ? tokens.accent : tokens.textMute} />
              <Text
                numberOfLines={1}
                style={{
                  color: showFilters || hasFilters ? tokens.accent : tokens.text,
                  fontSize: 13,
                  fontWeight: '700',
                  flex: 1,
                }}
              >
                {activeGenreName || 'All genres'} · {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </Text>
            </View>
            <ChevronDown
              size={16}
              color={showFilters || hasFilters ? tokens.accent : tokens.textMute}
              style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              onPress={clearFilters}
              style={{
                width: 40,
                height: 40,
                borderRadius: tokens.radiusMd,
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search filters"
            >
              <XIcon size={16} color={tokens.textMute} />
            </TouchableOpacity>
          )}
        </View>

        {showFilters && (
          <View
            style={{
              marginTop: 10,
              borderRadius: tokens.radiusLg,
              backgroundColor: tokens.card,
              borderWidth: 1,
              borderColor: tokens.border,
              padding: 12,
            }}
          >
            <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
              Sort tracks
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: genres.length > 0 ? 14 : 0 }}>
              {SORT_OPTIONS.map((option) => {
                const active = sort === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleSortChange(option.value)}
                    style={{
                      flex: 1,
                      minHeight: 34,
                      borderRadius: tokens.radiusMd,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? tokens.brand : tokens.surface,
                      borderWidth: 1,
                      borderColor: active ? tokens.brand : tokens.border,
                    }}
                  >
                    <Text style={{ color: active ? tokens.brandText : tokens.textMute, fontSize: 12, fontWeight: '700' }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {genres.length > 0 && (
              <>
                <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                  Genre
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <GenreChip
                    label="All"
                    active={!activeGenre}
                    onPress={() => handleGenreChange('')}
                    tokens={tokens}
                  />
                  {genres.map((g) => (
                    <GenreChip
                      key={g.id || g.slug}
                      label={g.name}
                      active={activeGenre === g.slug}
                      onPress={() => handleGenreChange(g.slug)}
                      tokens={tokens}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {!searched && genres.length > 0 && !showFilters && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
            Browse by genre
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {genres.slice(0, 6).map((g) => (
              <TouchableOpacity
                key={g.id || g.slug}
                onPress={() => handleGenreChange(g.slug)}
                style={{
                  width: '31%',
                  minHeight: 40,
                  borderRadius: tokens.radiusMd,
                  backgroundColor: tokens.card,
                  borderWidth: 1,
                  borderColor: tokens.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                }}
              >
                <Text numberOfLines={1} style={{ color: tokens.text, fontSize: 12, fontWeight: '700' }}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
            {genres.length > 6 && (
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={{
                  width: '31%',
                  minHeight: 40,
                  borderRadius: tokens.radiusMd,
                  backgroundColor: tokens.accentSoft,
                  borderWidth: 1,
                  borderColor: tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                }}
              >
                <Text numberOfLines={1} style={{ color: tokens.accent, fontSize: 12, fontWeight: '800' }}>
                  More
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
            Type a song, artist style, or vibe. Use filters when you want to browse.
          </Text>
        </View>
      ) : tab === 'tracks' ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <ResultHeader
              title={activeGenreName || (query ? 'Track results' : 'Browse tracks')}
              subtitle={`${tracks.length} track${tracks.length === 1 ? '' : 's'}${activeGenreName ? ` in ${activeGenreName}` : ''}`}
              tokens={tokens}
            />
          }
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
          numColumns={2}
          ListHeaderComponent={
            <ResultHeader
              title="Agent results"
              subtitle={`${agents.length} agent${agents.length === 1 ? '' : 's'} matching your search`}
              tokens={tokens}
            />
          }
          columnWrapperStyle={{ paddingHorizontal: 16, marginBottom: 16, gap: 12 }}
          renderItem={({ item }) => <AgentCard agent={item} variant="grid" />}
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

function GenreChip({
  label,
  active,
  onPress,
  tokens,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tokens: ReturnType<typeof useTokens>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        minHeight: 34,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? tokens.brand : tokens.surface,
        borderWidth: 1,
        borderColor: active ? tokens.brand : tokens.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: active ? tokens.brandText : tokens.textMute, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ResultHeader({
  title,
  subtitle,
  tokens,
}: {
  title: string;
  subtitle: string;
  tokens: ReturnType<typeof useTokens>;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 }}>
      <Text style={{ color: tokens.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
    </View>
  );
}
