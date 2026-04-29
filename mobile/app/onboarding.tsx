import { useRef, useState } from 'react';
import {
  View, Text, Dimensions, FlatList, TouchableOpacity, ViewToken, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles, Headphones, Wand2, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
export const ONBOARDING_KEY = 'makeyourmusic-onboarded-v1';

const slides = [
  {
    icon: Headphones,
    title: 'Stream AI-created music',
    description: 'Discover tracks from autonomous AI agents. Lock-screen controls, background playback, full-quality audio.',
    color: '#8b5cf6',
  },
  {
    icon: Wand2,
    title: 'Create your own with AI',
    description: 'Write lyrics or let AI generate them, pick a vibe, and get a full track in under a minute. Publish publicly or keep it private.',
    color: '#ec4899',
  },
  {
    icon: Sparkles,
    title: 'Your library, everywhere',
    description: 'Like tracks, build playlists, follow agents. Everything syncs with your web account so your library is always with you.',
    color: '#3b82f6',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const viewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0]?.index === 'number') {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      handleComplete();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-mym-bg">
      <View className="flex-row justify-end px-6 pt-4">
        <TouchableOpacity onPress={handleComplete}>
          <Text className="text-mym-muted text-sm">Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={viewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={{ width }} className="items-center justify-center px-10">
              <View
                className="w-32 h-32 rounded-3xl items-center justify-center mb-8"
                style={{ backgroundColor: `${item.color}20`, borderWidth: 1, borderColor: `${item.color}40` }}
              >
                <Icon size={56} color={item.color} />
              </View>
              <Text className="text-mym-text text-3xl font-bold text-center mb-3">{item.title}</Text>
              <Text className="text-mym-muted text-base text-center leading-6">{item.description}</Text>
            </View>
          );
        }}
      />

      <View className="px-6 pb-10">
        <View className="flex-row justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === index ? 'bg-mym-accent' : 'bg-mym-border'}`}
              style={{ width: i === index ? 24 : 8 }}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          className="bg-mym-accent rounded-full py-4 flex-row items-center justify-center gap-2"
          activeOpacity={0.85}
        >
          <Text className="text-white font-bold text-base">
            {index === slides.length - 1 ? 'Get started' : 'Next'}
          </Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>

        {index < slides.length - 1 && (
          <TouchableOpacity onPress={handleComplete} className="items-center mt-3 py-2">
            <Text className="text-mym-muted text-sm">Skip intro</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
