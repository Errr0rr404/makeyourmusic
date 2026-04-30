import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const tokens = useTokens();
  const isVintage = useIsVintage();
  return (
    <View className="flex-row items-center justify-between px-4 mb-3">
      <Text
        style={{
          color: tokens.text,
          fontSize: 20,
          fontWeight: '700',
          fontFamily: isVintage ? tokens.fontDisplay : undefined,
          textTransform: isVintage ? 'uppercase' : undefined,
          letterSpacing: isVintage ? 1 : undefined,
        }}
      >
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          className="flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          hitSlop={8}
        >
          <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600', marginRight: 2 }}>See all</Text>
          <ChevronRight size={16} color={tokens.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}
