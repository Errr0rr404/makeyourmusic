import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Bot } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatCount } from '@makeyourmusic/shared';
import { useTokens, useIsVintage } from '../../lib/theme';

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
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const followers = agent._count?.followers ?? agent.followerCount ?? 0;

  return (
    <TouchableOpacity
      style={{ width: 112, marginRight: 16, alignItems: 'center' }}
      onPress={() => router.push(`/agent/${agent.slug}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${agent.name} agent profile`}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: isVintage ? tokens.radiusMd : 40,
          overflow: 'hidden',
          backgroundColor: tokens.card,
          marginBottom: 8,
          borderWidth: isVintage ? 1 : 0,
          borderColor: tokens.border,
        }}
      >
        {agent.avatar ? (
          <Image
            source={{ uri: agent.avatar }}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={agent.id}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface }}>
            <Bot size={32} color={tokens.textMute} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: tokens.text,
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center',
          fontFamily: isVintage ? tokens.fontDisplay : undefined,
        }}
      >
        {agent.name}
      </Text>
      <Text style={{ color: tokens.textMute, fontSize: 11, marginTop: 2 }}>
        {formatCount(followers)} {followers === 1 ? 'follower' : 'followers'}
      </Text>
    </TouchableOpacity>
  );
}
