import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { getApi, useAuthStore, formatCount } from '@makeyourmusic/shared';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  const { user, isAuthenticated } = useAuthStore();
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

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#fafafa',
            headerTitle: 'Creator Studio',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} className="p-2">
                <ArrowLeft size={24} color="#fafafa" />
              </TouchableOpacity>
            ),
          }}
        />
        <ScreenContainer>
          <View className="flex-1 items-center justify-center px-8 pt-32">
            <Bot size={48} color="#2a2a2a" />
            <Text className="text-mym-text text-xl font-bold mt-4 mb-2">Creator Studio</Text>
            <Text className="text-mym-muted text-center mb-6">
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fafafa',
          headerTitle: 'Creator Studio',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft size={24} color="#fafafa" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScreenContainer>
        <View className="px-4 pb-4">
          <Text className="text-mym-muted text-sm mb-4">
            Manage your AI agents and their music
          </Text>

          {/* Create Agent */}
          {!showCreateForm ? (
            <Button
              title="Create New Agent"
              onPress={() => setShowCreateForm(true)}
              variant="secondary"
            />
          ) : (
            <View className="bg-mym-card border border-mym-border rounded-xl p-4 mb-4">
              <Input
                label="Agent Name"
                placeholder="e.g. Neural Beats"
                value={newAgentName}
                onChangeText={setNewAgentName}
              />
              <View className="flex-row space-x-3">
                <View className="flex-1 mr-2">
                  <Button title="Create" onPress={handleCreateAgent} loading={creating} />
                </View>
                <View className="flex-1">
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
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : agents.length === 0 ? (
          <View className="items-center py-12 px-8">
            <Bot size={48} color="#2a2a2a" />
            <Text className="text-mym-muted text-center mt-4">
              You don't have any AI agents yet. Create one to start uploading music!
            </Text>
          </View>
        ) : (
          agents.map((agent) => (
            <TouchableOpacity
              key={agent.id}
              className="flex-row items-center px-4 py-4 border-b border-mym-border"
              onPress={() => router.push(`/agent/${agent.slug}`)}
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-full bg-mym-surface items-center justify-center mr-4">
                <Bot size={24} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-mym-text text-base font-semibold">{agent.name}</Text>
                <View className="flex-row items-center mt-1">
                  <Music size={12} color="#a1a1aa" />
                  <Text className="text-mym-muted text-xs ml-1 mr-3">
                    {agent._count?.tracks || 0} tracks
                  </Text>
                  <BarChart3 size={12} color="#a1a1aa" />
                  <Text className="text-mym-muted text-xs ml-1">
                    {formatCount(agent.totalPlays)} plays
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/dashboard/upload')}
                className="bg-mym-accent rounded-full p-2"
              >
                <Plus size={16} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScreenContainer>
    </>
  );
}
