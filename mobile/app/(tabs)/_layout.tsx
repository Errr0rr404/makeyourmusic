import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Library, User, Wand2 } from 'lucide-react-native';
import { useAuthStore } from '@makeyourmusic/shared';
import { hapticMedium } from '../../services/hapticService';
import { useTokens, useIsVintage } from '../../lib/theme';

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const insets = useSafeAreaInsets();

  // Adaptive tab bar height: tighter on Android (no home indicator), padded
  // on iOS for the home indicator.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12);
  const barHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textMute,
        tabBarStyle: {
          backgroundColor: isVintage ? tokens.metal : tokens.surface,
          borderTopColor: isVintage ? tokens.metalShadow : tokens.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: isVintage ? tokens.fontDisplay : undefined,
          textTransform: isVintage ? 'uppercase' : undefined,
          letterSpacing: isVintage ? 1 : undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />

      {/* Prominent Create button in the middle — opens the studio modal */}
      <Tabs.Screen
        name="create-fake"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                router.push('/create');
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create new track"
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: isVintage ? tokens.radiusMd : 24,
                  backgroundColor: tokens.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: -20,
                  shadowColor: tokens.brand,
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                  borderWidth: isVintage ? 1 : 0,
                  borderColor: tokens.brandStrong,
                }}
              >
                <Wand2 size={20} color={tokens.brandText} />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  marginTop: 32,
                  color: tokens.brand,
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                  letterSpacing: isVintage ? 1 : undefined,
                }}
              >
                {isVintage ? 'REC' : 'Create'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Library size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          // Intercept navigation: push profile screen instead of rendering Feed tab
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => {
                hapticMedium();
                router.push(isAuthenticated ? '/profile' : '/(auth)/login');
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <User size={24} color={tokens.textMute} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 4,
                  color: tokens.textMute,
                  fontFamily: isVintage ? tokens.fontDisplay : undefined,
                  textTransform: isVintage ? 'uppercase' : undefined,
                  letterSpacing: isVintage ? 1 : undefined,
                }}
              >
                Profile
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
