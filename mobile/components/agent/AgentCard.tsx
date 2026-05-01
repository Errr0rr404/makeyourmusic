import { View, Text, TouchableOpacity, type ViewStyle } from 'react-native';
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
  variant?: 'carousel' | 'grid';
  style?: ViewStyle;
}

export function AgentCard({ agent, variant = 'carousel', style }: AgentCardProps) {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const followers = agent._count?.followers ?? agent.followerCount ?? 0;
  const isGrid = variant === 'grid';
  const avatarSize = isGrid ? 72 : 80;

  return (
    <TouchableOpacity
      style={[
        isGrid
          ? { flex: 1, alignItems: 'center' }
          : { width: 112, marginRight: 16, alignItems: 'center' },
        style,
      ]}
      onPress={() => router.push(`/agent/${agent.slug}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${agent.name} agent profile`}
    >
      <View
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: isVintage ? tokens.radiusMd : avatarSize / 2,
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
            style={{ width: avatarSize, height: avatarSize }}
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
