import { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
// Audio preview cleanup on blur uses the Audio import below
import { useAuthStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, Sparkles, Wand2, Clock, CheckCircle2, AlertCircle, XCircle,
  Play, Pause, Globe, LockKeyhole, Trash2, Upload, RefreshCw, Lock,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { useTokens, type ThemeTokens } from '../../lib/theme';
import { Audio } from 'expo-av';
import TrackPlayer from 'react-native-track-player';

interface Gen {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  title?: string | null;
  prompt?: string | null;
  audioUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  durationSec?: number | null;
  isInstrumental: boolean;
  agent?: { id: string; name: string; slug: string } | null;
  track?: { id: string; slug: string; title: string; isPublic: boolean } | null;
  providerModel?: string | null;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: 'FREE' | 'CREATOR' | 'PREMIUM';
}

function usageTierLabel(tier: Usage['tier']): string {
  if (tier === 'PREMIUM') return 'Premium';
  if (tier === 'CREATOR') return 'Creator';
  return 'Free';
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status, tokens }: { status: Gen['status']; tokens: ThemeTokens }) {
  const config = {
    PENDING: { label: 'Queued', color: tokens.ledAmber, Icon: Clock },
    PROCESSING: { label: 'Generating', color: tokens.accent, Icon: Wand2 },
    COMPLETED: { label: 'Ready', color: tokens.ledGreen, Icon: CheckCircle2 },
    FAILED: { label: 'Failed', color: '#f87171', Icon: XCircle },
  }[status];
  const { Icon, color } = config;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: `${color}26`,
        borderWidth: 1,
        borderColor: `${color}40`,
      }}
    >
      <Icon size={10} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{config.label}</Text>
    </View>
  );
}

export default function GenerationsScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { isAuthenticated } = useAuthStore();
  const [generations, setGenerations] = useState<Gen[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const sound = useRef<any>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      const [genRes, usageRes] = await Promise.allSettled([
        getApi().get('/ai/generations?limit=50'),
        getApi().get('/ai/usage'),
      ]);
      if (genRes.status === 'fulfilled') {
        setGenerations(genRes.value.data.music || []);
      } else {
        setError('Failed to load generations');
      }
      if (usageRes.status === 'fulfilled') {
        setUsage(usageRes.value.data.usage);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load generations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Poll while any generation is in progress. Depend on a stable boolean
  // so the interval only resets when the in-progress status genuinely
  // changes, not on every load() resolve.
  const hasInProgress = generations.some(
    (g) => g.status === 'PENDING' || g.status === 'PROCESSING',
  );
  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [hasInProgress, load]);

  // Cleanup audio on unmount
  useEffect(() => () => { sound.current?.unloadAsync?.(); }, []);

  // Pause on blur so audio doesn't keep playing after the user leaves the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        sound.current?.pauseAsync?.().catch(() => {});
        setPlayingId(null);
      };
    }, [])
  );

  // Reentrancy guard: two fast taps on different items used to race the
  // createAsync() call, leaving the second's `sound.current` overwriting
  // the first while the first was still loading. Mirror the create-screen
  // pattern to short-circuit while a play call is mid-flight.
  const previewBusyRef = useRef(false);
  const togglePlay = async (gen: Gen) => {
    if (!gen.audioUrl) return;
    if (previewBusyRef.current) return;
    previewBusyRef.current = true;
    try {
      if (playingId === gen.id) {
        await sound.current?.pauseAsync?.().catch(() => undefined);
        setPlayingId(null);
        return;
      }
      // Pause the main player before playing a generation preview, otherwise
      // the user hears two streams simultaneously.
      try { await TrackPlayer.pause(); } catch { /* not initialized */ }
      // Stop previous
      if (sound.current) {
        await sound.current.unloadAsync?.().catch(() => undefined);
        sound.current = null;
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri: gen.audioUrl });
      // If a faster tap landed first while we were awaiting createAsync,
      // throw this one away.
      if (sound.current) {
        await s.unloadAsync().catch(() => undefined);
        return;
      }
      sound.current = s;
      s.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) setPlayingId(null);
      });
      await s.playAsync();
      setPlayingId(gen.id);
    } finally {
      previewBusyRef.current = false;
    }
  };

  const handleDelete = (gen: Gen) => {
    Alert.alert(
      `Delete "${gen.title || 'untitled'}"?`,
      gen.track ? 'History removed, published track will remain.' : 'The audio will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (playingId === gen.id) {
                await sound.current?.unloadAsync?.();
                sound.current = null;
                setPlayingId(null);
              }
              await getApi().delete(`/ai/generations/${gen.id}`);
              setGenerations((prev) => prev.filter((x) => x.id !== gen.id));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Lock size={48} color={tokens.textMute} />
          <Text className="text-mym-text text-xl font-bold mt-4 mb-2">Your Generations</Text>
          <Text className="text-mym-muted text-sm mb-6">Log in to see your AI generations</Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button" hitSlop={8}>
            <ArrowLeft size={20} color={tokens.textMute} />
          </TouchableOpacity>
          <View>
            <View className="flex-row items-center gap-1.5">
              <Sparkles size={12} color={tokens.accent} />
              <Text style={{ color: tokens.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Studio</Text>
            </View>
            <Text className="text-mym-text text-lg font-bold">My generations</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {usage && (
            <View className="items-end mr-1">
              <Text className="text-mym-muted text-[10px] uppercase">{usageTierLabel(usage.tier)}</Text>
              <Text className="text-mym-text text-sm font-bold">
                {usage.used}/{usage.limit}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.push('/create')}
            accessibilityLabel="New generation"
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: tokens.accent,
              minHeight: 36,
            }}
          >
            <Wand2 size={12} color={tokens.brandText} />
            <Text style={{ color: tokens.brandText, fontSize: 12, fontWeight: '600' }}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View className="mx-4 mb-3 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 flex-row items-center gap-2">
          <AlertCircle size={14} color="#f87171" />
          <Text className="text-red-400 text-sm flex-1">{error}</Text>
          <TouchableOpacity onPress={load} accessibilityRole="button">
            <Text className="text-red-300 text-xs underline">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.accent} size="large" />
        </View>
      ) : generations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Wand2 size={40} color={tokens.textMute} />
          <Text className="text-mym-text text-lg font-bold mt-3 mb-1">No generations yet</Text>
          <Text className="text-mym-muted text-sm mb-5 text-center">Start creating music with AI</Text>
          <TouchableOpacity
            onPress={() => router.push('/create')}
            accessibilityLabel="Create your first track"
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: tokens.accent,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 999,
              minHeight: 48,
            }}
          >
            <Wand2 size={14} color={tokens.brandText} />
            <Text style={{ color: tokens.brandText, fontWeight: '600' }}>Create your first track</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={generations}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={tokens.accent}
            />
          }
          renderItem={({ item }) => (
            <View className="bg-mym-card border border-mym-border rounded-xl p-4 mb-3">
              <View className="flex-row items-start gap-2 mb-1 flex-wrap">
                <Text className="text-mym-text text-base font-semibold flex-1" numberOfLines={1}>
                  {item.title || <Text className="text-mym-muted">Untitled</Text>}
                </Text>
                <StatusBadge status={item.status} tokens={tokens} />
                {item.track && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: tokens.surface,
                    }}
                  >
                    {item.track.isPublic ? (
                      <Globe size={9} color={tokens.textMute} />
                    ) : (
                      <LockKeyhole size={9} color={tokens.textMute} />
                    )}
                    <Text className="text-[10px] text-mym-muted">{item.track.isPublic ? 'Public' : 'Private'}</Text>
                  </View>
                )}
              </View>
              {item.prompt && (
                <Text className="text-mym-muted text-xs" numberOfLines={1}>{item.prompt}</Text>
              )}
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-mym-muted text-xs">{timeAgo(item.createdAt)}</Text>
                {item.durationSec && (
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color={tokens.textMute} />
                    <Text className="text-mym-muted text-xs">
                      {Math.floor(item.durationSec / 60)}:{(item.durationSec % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}
                {item.isInstrumental && <Text className="text-mym-muted text-xs">· Instrumental</Text>}
              </View>

              {item.status === 'COMPLETED' && item.audioUrl && (
                <View className="flex-row items-center gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() => togglePlay(item)}
                    accessibilityLabel={playingId === item.id ? 'Pause preview' : 'Play preview'}
                    accessibilityRole="button"
                    className="w-10 h-10 rounded-full bg-mym-accent items-center justify-center"
                  >
                    {playingId === item.id ? (
                      <Pause size={16} color={tokens.brandText} fill={tokens.brandText} />
                    ) : (
                      <Play size={16} color={tokens.brandText} fill={tokens.brandText} />
                    )}
                  </TouchableOpacity>
                  {!item.track ? (
                    <TouchableOpacity
                      onPress={() => {
                        const genId = item.id;
                        if (!genId) {
                          Alert.alert('Error', 'Invalid generation ID');
                          return;
                        }
                        router.push(`/create?generation=${genId}`);
                      }}
                      accessibilityLabel="Publish generation"
                      accessibilityRole="button"
                      className="flex-row items-center gap-1 px-3 py-2 rounded-lg bg-mym-accent/20 border border-mym-accent/30"
                    >
                      <Upload size={12} color={tokens.accent} />
                      <Text className="text-mym-accent text-xs font-semibold">Publish</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        const slug = item.track?.slug;
                        if (!slug) {
                          Alert.alert('Error', 'Track not available');
                          return;
                        }
                        router.push(`/track/${slug}`);
                      }}
                      accessibilityLabel="Open track"
                      accessibilityRole="button"
                      className="flex-row items-center gap-1 px-3 py-2 rounded-lg bg-mym-surface border border-mym-border"
                    >
                      <Play size={12} color={tokens.textMute} />
                      <Text className="text-mym-text text-xs font-semibold">Open track</Text>
                    </TouchableOpacity>
                  )}
                  <View className="flex-1" />
                  <TouchableOpacity onPress={() => handleDelete(item)} className="p-2">
                    <Trash2 size={14} color="#f87171" />
                  </TouchableOpacity>
                </View>
              )}

              {item.status === 'FAILED' && (
                <View className="mt-3 flex-row items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                  <AlertCircle size={12} color="#f87171" />
                  <Text className="text-red-400 text-xs flex-1">{item.errorMessage || 'Unknown error'}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Trash2 size={12} color="#f87171" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
