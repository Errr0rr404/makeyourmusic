import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApi, useAuthStore, formatCount } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTokens, useIsVintage } from '../../lib/theme';
import { ArrowLeft, Plus, Bot, Music, BarChart3 } from 'lucide-react-native';

interface AgentSummary {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
  status: string;
  totalPlays: number;
  _count?: { tracks: number; followers: number };
}

export default function DashboardScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      const api = getApi();
      const res = await api.get('/agents/mine');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAgents();
    else setLoading(false);
  }, [isAuthenticated, fetchAgents]);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    setCreating(true);
    try {
      const api = getApi();
      await api.post('/agents', { name: newAgentName.trim() });
      setNewAgentName('');
      setShowCreateForm(false);
      fetchAgents();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const headerOptions = {
    headerShown: true as const,
    headerStyle: { backgroundColor: tokens.bg },
    headerTintColor: tokens.text,
    headerTitle: 'Creator Studio',
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: 8 }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <ArrowLeft size={24} color={tokens.text} />
      </TouchableOpacity>
    ),
  };

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <ScreenContainer>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top + 48 }}>
            <Bot size={48} color={tokens.borderStrong} />
            <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
              Creator Studio
            </Text>
            <Text style={{ color: tokens.textMute, textAlign: 'center', marginBottom: 24, fontSize: 14, lineHeight: 20 }}>
              Sign in to manage your AI agents and upload music.
            </Text>
            <Button title="Sign In" onPress={() => router.push('/(auth)/login')} />
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <ScreenContainer>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginBottom: 16 }}>
            Manage your AI agents and their music
          </Text>

          {!showCreateForm ? (
            <Button
              title="Create New Agent"
              onPress={() => setShowCreateForm(true)}
              variant="secondary"
            />
          ) : (
            <View
              style={{
                backgroundColor: tokens.card,
                borderWidth: 1,
                borderColor: tokens.border,
                borderRadius: tokens.radiusLg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Input
                label="Agent Name"
                placeholder="e.g. Neural Beats"
                value={newAgentName}
                onChangeText={setNewAgentName}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Create" onPress={handleCreateAgent} loading={creating} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewAgentName('');
                    }}
                    variant="ghost"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Agents List */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={tokens.brand} />
          </View>
        ) : agents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
            <Bot size={48} color={tokens.borderStrong} />
            <Text style={{ color: tokens.textMute, textAlign: 'center', marginTop: 16, fontSize: 14, lineHeight: 20 }}>
              You don't have any AI agents yet. Create one to start uploading music!
            </Text>
          </View>
        ) : (
          agents.map((agent) => (
            <TouchableOpacity
              key={agent.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}
              onPress={() => router.push(`/agent/${agent.slug}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open ${agent.name} agent`}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: isVintage ? tokens.radiusMd : 28,
                  backgroundColor: tokens.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  overflow: 'hidden',
                }}
              >
                {agent.avatar ? (
                  <Image
                    source={{ uri: agent.avatar }}
                    style={{ width: 56, height: 56 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={agent.id}
                  />
                ) : (
                  <Bot size={24} color={tokens.accent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: tokens.text,
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  }}
                  numberOfLines={1}
                >
                  {agent.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Music size={12} color={tokens.textMute} />
                    <Text style={{ color: tokens.textMute, fontSize: 12 }}>
                      {agent._count?.tracks || 0} tracks
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <BarChart3 size={12} color={tokens.textMute} />
                    <Text style={{ color: tokens.textMute, fontSize: 12 }}>
                      {formatCount(agent.totalPlays)} plays
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/dashboard/upload')}
                style={{
                  backgroundColor: tokens.brand,
                  borderRadius: 999,
                  padding: 8,
                }}
                accessibilityLabel={`Upload track for ${agent.name}`}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Plus size={16} color={tokens.brandText} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScreenContainer>
    </>
  );
}
