import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import { useTokens } from '../../lib/theme';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padBottom?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  padBottom = true,
}: ScreenContainerProps) {
  const tokens = useTokens();
  const insets = useSafeAreaInsets();

  if (scrollable) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top', 'bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: padBottom ? 140 + insets.bottom : 20 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={tokens.brand}
                colors={[tokens.brand]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
