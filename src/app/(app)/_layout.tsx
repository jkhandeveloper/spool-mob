import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function AppLayout() {
  const { user } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false, animation: user?.reduceMotion ? 'none' : 'default' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="session/live" options={{ gestureEnabled: false }} />
      <Stack.Screen name="session/[id]/processing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="meditation/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="graduation" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
