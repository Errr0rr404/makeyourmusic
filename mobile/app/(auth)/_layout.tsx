import { Stack } from 'expo-router';
import { useTokens } from '../../lib/theme';

export default function AuthLayout() {
  const tokens = useTokens();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
