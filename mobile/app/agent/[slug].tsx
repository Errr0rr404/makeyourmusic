import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { getApi, useAuthStore, formatCount } from '@morlo/shared';
import type { Agent, TrackItem } from '@morlo/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TrackRow } from '../../components/track/TrackRow';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, UserPlus, UserCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function AgentProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    fetchAgent();
  }, [slug]);

  const fetchAgent = async () => {
    try {
      setError(null);
      const api = getApi();
      // First fetch agent by slug
      const agentRes = await api.get(`/agents/${slug}`);
      const a = agentRes.data.agent || agentRes.data;
      setAgent(a);
      setFollowing(a.isFollowing || false);
      setFollowerCount(a._count?.followers || a.followerCount || 0);

      // Then fetch tracks using agent's actual ID
      if (a?.id) {
        const tracksRes = await api.get(`/tracks?agentId=${a.id}&limit=50`);
        setTracks(tracksRes.data.tracks || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

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
      <View className="flex-1 bg-morlo-bg items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (error || !agent) {
    return (
      <View className="flex-1 bg-morlo-bg items-center justify-center px-8">
        <Text className="text-morlo-muted text-base mb-4">{error || 'Agent not found'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-morlo-accent text-base font-medium">Go Back</Text>
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
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fafafa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        {/* Agent Header */}
        <View className="items-center px-6 pt-12 pb-6">
          <View className="w-28 h-28 rounded-full overflow-hidden bg-morlo-card mb-4">
            {agent.avatar ? (
              <Image
                source={{ uri: agent.avatar }}
                style={{ width: 112, height: 112 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-morlo-surface">
                <Text className="text-4xl">🤖</Text>
              </View>
            )}
          </View>

          <Text className="text-morlo-text text-2xl font-bold">{agent.name}</Text>
          <Text className="text-morlo-muted text-sm mt-1">AI Music Agent</Text>

          {/* Stats */}
          <View className="flex-row items-center mt-4 space-x-6">
            <View className="items-center mx-4">
              <Text className="text-morlo-text text-lg font-bold">
                {formatCount(agent._count?.tracks || 0)}
              </Text>
              <Text className="text-morlo-muted text-xs">Tracks</Text>
            </View>
            <View className="items-center mx-4">
              <Text className="text-morlo-text text-lg font-bold">
                {formatCount(followerCount)}
              </Text>
              <Text className="text-morlo-muted text-xs">Followers</Text>
            </View>
            <View className="items-center mx-4">
              <Text className="text-morlo-text text-lg font-bold">
                {formatCount(agent.totalPlays || 0)}
              </Text>
              <Text className="text-morlo-muted text-xs">Plays</Text>
            </View>
          </View>

          {/* Follow button */}
          {isAuthenticated && (
            <View className="mt-4">
              <Button
                title={following ? 'Following' : 'Follow'}
                onPress={handleFollow}
                variant={following ? 'secondary' : 'primary'}
              />
            </View>
          )}

          {agent.bio && (
            <Text className="text-morlo-muted text-sm text-center mt-4 px-4">
              {agent.bio}
            </Text>
          )}
        </View>

        {/* Tracks */}
        <View className="mt-2">
          <View className="px-4 mb-3">
            <Text className="text-morlo-text text-lg font-bold">Tracks</Text>
          </View>
          {tracks.length > 0 ? (
            tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} queue={tracks} index={i} showAgent={false} />
            ))
          ) : (
            <View className="items-center py-8">
              <Text className="text-morlo-muted">No tracks yet</Text>
            </View>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}
