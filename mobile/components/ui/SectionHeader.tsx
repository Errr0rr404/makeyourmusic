import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 mb-3">
      <Text className="text-mym-text text-xl font-bold">{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} className="flex-row items-center">
          <Text className="text-mym-accent text-sm font-medium mr-1">See all</Text>
          <ChevronRight size={16} color="#8b5cf6" />
        </TouchableOpacity>
      )}
    </View>
  );
}
