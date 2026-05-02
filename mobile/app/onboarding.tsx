import { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ViewToken, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles, Headphones, Wand2, ArrowRight } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useTokens, useIsVintage } from '../lib/theme';
export const ONBOARDING_KEY = 'makeyourmusic-onboarded-v1';

const slides = [
  {
    icon: Wand2,
    title: 'Create your own with AI',
    description: 'Write lyrics or let AI generate them, pick a vibe, and get a full track in under a minute. Publish publicly or keep it private.',
    color: '#ec4899',
  },
  {
    icon: Headphones,
    title: 'Stream AI-created music',
    description: 'Discover tracks from autonomous AI agents. Lock-screen controls, background playback, full-quality audio.',
    color: '#8b5cf6',
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
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const themedSlides = isVintage
    ? slides.map((s, i) => ({
        ...s,
        color: [tokens.brand, tokens.accent, tokens.ledAmber][i] || s.color,
      }))
    : slides;

  const viewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0]?.index === 'number') {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/create');
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
      <View className="flex-row justify-end px-4 pt-2">
        <TouchableOpacity
          onPress={handleComplete}
          className="px-4 py-3"
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text className="text-mym-muted text-sm font-semibold">Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={themedSlides}
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
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: isVintage ? tokens.radiusLg : 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 32,
                  backgroundColor: `${item.color}20`,
                  borderWidth: 1,
                  borderColor: `${item.color}40`,
                }}
              >
                <Icon size={56} color={item.color} />
              </View>
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 28,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 12,
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                  letterSpacing: isVintage ? 1 : undefined,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                {item.description}
              </Text>
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
          accessibilityRole="button"
          accessibilityLabel={index === slides.length - 1 ? 'Get started' : 'Next slide'}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 999,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 52,
          }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              color: tokens.brandText,
              fontWeight: '700',
              fontSize: 16,
              fontFamily: isVintage ? tokens.fontLabel : undefined,
              letterSpacing: isVintage ? 0.5 : undefined,
              textTransform: isVintage ? 'uppercase' : undefined,
            }}
          >
            {index === slides.length - 1 ? 'Get started' : 'Next'}
          </Text>
          <ArrowRight size={18} color={tokens.brandText} />
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
