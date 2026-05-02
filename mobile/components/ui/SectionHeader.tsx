import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  const tokens = useTokens();
  const isVintage = useIsVintage();
  return (
    <View className="flex-row items-end justify-between px-4 mb-3">
      <View style={{ flex: 1, paddingRight: 12 }}>
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
        {subtitle ? (
          <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
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
