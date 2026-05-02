import { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles, Headphones, Wand2, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { useTokens, useIsVintage } from '../lib/theme';
export const ONBOARDING_KEY = 'makeyourmusic-onboarded-v1';

// Slide colors are RGB triplets so we can render the hero icon's tint and the
// halo behind it through `rgba(...)`. Some Android devices render the
// `#RRGGBBAA` short-form inconsistently for non-#RRGGBB sources, so we keep
// alpha out-of-band and compose it at render time.
const slides = [
  {
    icon: Wand2,
    title: 'Create your own with AI',
    description: 'Write lyrics or let AI generate them, pick a vibe, and get a full track in under a minute. Publish publicly or keep it private.',
    rgb: '236, 72, 153',
  },
  {
    icon: Headphones,
    title: 'Stream AI-created music',
    description: 'Discover tracks from autonomous AI agents. Lock-screen controls, background playback, full-quality audio.',
    rgb: '139, 92, 246',
  },
  {
    icon: Sparkles,
    title: 'Your library, everywhere',
    description: 'Like tracks, build playlists, follow agents. Everything syncs with your web account so your library is always with you.',
    rgb: '59, 130, 246',
  },
];

function rgbToCss(rgb: string): string {
  return `rgb(${rgb})`;
}
function rgbaToCss(rgb: string, alpha: number): string {
  return `rgba(${rgb}, ${alpha})`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  // Vintage skin tints the hero icons with the active palette so they stop
  // looking like a different design system landed in the middle of the deck.
  const themedSlides = isVintage
    ? slides.map((s, i) => {
        const tints = ['232, 90, 60', '255, 179, 71', '91, 138, 58']; // brand / amber / green
        return { ...s, rgb: tints[i] || s.rgb };
      })
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

  const isLast = index === slides.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8, height: 44 }}>
        {!isLast && (
          <TouchableOpacity
            onPress={handleComplete}
            hitSlop={8}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={{ color: tokens.textMute, fontSize: 14, fontWeight: '600' }}>Skip</Text>
          </TouchableOpacity>
        )}
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
            <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
              <View
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: isVintage ? tokens.radiusLg : 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 32,
                  backgroundColor: rgbaToCss(item.rgb, 0.14),
                  borderWidth: 1,
                  borderColor: rgbaToCss(item.rgb, 0.32),
                }}
              >
                <Icon size={56} color={rgbToCss(item.rgb)} />
              </View>
              <Text
                style={{
                  color: tokens.text,
                  fontSize: 26,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 12,
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                  letterSpacing: isVintage ? 1 : -0.4,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ color: tokens.textMute, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 380 }}>
                {item.description}
              </Text>
            </View>
          );
        }}
      />

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {slides.map((_, i) => {
            const active = i === index;
            return (
              <View
                key={i}
                style={{
                  height: 6,
                  width: active ? 28 : 6,
                  borderRadius: 999,
                  backgroundColor: active ? tokens.accent : tokens.border,
                }}
              />
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
          style={{
            backgroundColor: tokens.accent,
            borderRadius: 999,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 52,
            shadowColor: tokens.accent,
            shadowOpacity: 0.32,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
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
            {isLast ? 'Get started' : 'Next'}
          </Text>
          <ArrowRight size={18} color={tokens.brandText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
