import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { getApi, useAuthStore, formatCount } from '@makeyourmusic/shared';
import type { Agent, TrackItem } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Bot, Music } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { asSlug } from '../../lib/validateSlug';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function AgentProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const tokens = useTokens();
  const isVintage = useIsVintage();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    const safeSlug = asSlug(slug);
    if (!safeSlug) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const api = getApi();
        const agentRes = await api.get(`/agents/${safeSlug}`);
        if (cancelled) return;
        const a = agentRes.data.agent || agentRes.data;
        setAgent(a);
        setFollowing(a.isFollowing || false);
        setFollowerCount(a._count?.followers || a.followerCount || 0);

        if (a?.id) {
          const tracksRes = await api.get(`/tracks?agentId=${a.id}&limit=50`);
          if (!cancelled) setTracks(tracksRes.data.tracks || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load agent');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const handleFollow = async () => {
    if (!isAuthenticated || !agent) return;
    try {
      const api = getApi();
      const res = await api.post(`/social/follows/${agent.id}`);
      setFollowing(res.data.following);
      setFollowerCount((c) => (res.data.following ? c + 1 : c - 1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={tokens.brand} />
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: tokens.textMute, fontSize: 15, marginBottom: 16, textAlign: 'center' }}>
          {error || 'Agent not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: tokens.accent, fontSize: 15, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={tokens.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        {/* Agent Header */}
        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24 }}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: isVintage ? tokens.radiusLg : 56,
              overflow: 'hidden',
              backgroundColor: tokens.card,
              marginBottom: 16,
              borderWidth: isVintage ? 1 : 0,
              borderColor: tokens.border,
            }}
          >
            {agent.avatar ? (
              <Image
                source={{ uri: agent.avatar }}
                style={{ width: 112, height: 112 }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={agent.id}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
                <Bot size={44} color={tokens.textMute} />
              </View>
            )}
          </View>

          <Text
            style={{
              color: tokens.text,
              fontSize: 24,
              fontWeight: '700',
              fontFamily: isVintage ? tokens.fontDisplay : undefined,
              textTransform: isVintage ? 'uppercase' : undefined,
              letterSpacing: isVintage ? 0.5 : undefined,
            }}
          >
            {agent.name}
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4 }}>AI Music Agent</Text>

          {/* Stats */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700' }}>
                {formatCount(agent._count?.tracks || 0)}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>Tracks</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700' }}>
                {formatCount(followerCount)}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>Followers</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700' }}>
                {formatCount(agent.totalPlays || 0)}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>Plays</Text>
            </View>
          </View>

          {/* Follow button */}
          {isAuthenticated && (
            <View style={{ marginTop: 16, minWidth: 160 }}>
              <Button
                title={following ? 'Following' : 'Follow'}
                onPress={handleFollow}
                variant={following ? 'secondary' : 'primary'}
              />
            </View>
          )}

          {agent.bio && (
            <Text style={{ color: tokens.textMute, fontSize: 13, textAlign: 'center', marginTop: 16, paddingHorizontal: 16, lineHeight: 19 }}>
              {agent.bio}
            </Text>
          )}
        </View>

        {/* Tracks */}
        <View style={{ marginTop: 8 }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Music size={16} color={tokens.accent} />
            <Text
              style={{
                color: tokens.text,
                fontSize: 17,
                fontWeight: '700',
                fontFamily: isVintage ? tokens.fontDisplay : undefined,
                textTransform: isVintage ? 'uppercase' : undefined,
                letterSpacing: isVintage ? 1 : undefined,
              }}
            >
              Tracks
            </Text>
            <Text style={{ color: tokens.textMute, fontSize: 12 }}>
              ({tracks.length})
            </Text>
          </View>
          {tracks.length > 0 ? (
            tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} queue={tracks} index={i} showAgent={false} />
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ color: tokens.textMute, fontSize: 13 }}>No tracks yet</Text>
            </View>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}
