import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text } from 'react-native';
import { Home, Search, Library, User, Wand2 } from 'lucide-react-native';
import { useAuthStore } from '@morlo/shared';
import { hapticMedium } from '../../services/hapticService';

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: '#141414',
          borderTopColor: '#2a2a2a',
          height: 85,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
                router.push(isAuthenticated ? '/create' : '/(auth)/login');
              }}
              className="flex-1 items-center justify-center"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-morlo-accent items-center justify-center -mt-5 shadow-lg" style={{ shadowColor: '#8b5cf6', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
                <Wand2 size={20} color="#fff" />
              </View>
              <Text className="text-[10px] font-semibold mt-1 text-morlo-accent">Create</Text>
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
              className="flex-1 items-center justify-center pt-2"
              activeOpacity={0.7}
            >
              <User size={24} color="#71717a" />
              <Text className="text-[11px] font-semibold mt-1" style={{ color: '#71717a' }}>
                Profile
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
