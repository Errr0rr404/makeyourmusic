import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { formatCount } from '@makeyourmusic/shared';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    slug: string;
    avatar: string | null;
    _count?: { tracks: number; followers: number };
    followerCount?: number;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const router = useRouter();
  const followers = agent._count?.followers ?? agent.followerCount ?? 0;

  return (
    <TouchableOpacity
      className="items-center mr-4 w-28"
      onPress={() => router.push(`/agent/${agent.slug}`)}
      activeOpacity={0.7}
    >
      <View className="w-20 h-20 rounded-full overflow-hidden bg-morlo-card mb-2">
        {agent.avatar ? (
          <Image
            source={{ uri: agent.avatar }}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-morlo-surface">
            <Text className="text-2xl">🤖</Text>
          </View>
        )}
      </View>
      <Text className="text-morlo-text text-sm font-semibold text-center" numberOfLines={1}>
        {agent.name}
      </Text>
      <Text className="text-morlo-muted text-xs">
        {formatCount(followers)} followers
      </Text>
    </TouchableOpacity>
  );
}
