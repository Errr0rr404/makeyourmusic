import { Stack } from 'expo-router';
import { useTokens } from '../../lib/theme';

export default function DashboardLayout() {
  const tokens = useTokens();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    />
  );
}
