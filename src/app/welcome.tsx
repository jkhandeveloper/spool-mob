import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Gap, Logo, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// 08 Welcome
export default function Welcome() {
  const c = useTheme();
  const features = [
    { icon: 'pencil-outline', text: 'Make room for your thoughts' },
    { icon: 'calendar-clear-outline', text: 'Keep your sessions close' },
    { icon: 'footsteps-outline', text: 'Find your next small step' },
  ] as const;

  return (
    <Screen
      footer={
        <>
          <Button title="Get started" onPress={() => router.push('/sign-up')} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm }}>
            <T variant="caption">Already have an account?</T>
            <T
              variant="caption"
              style={{ fontWeight: '800' }}
              accessibilityRole="link"
              onPress={() => router.push('/sign-in')}>
              Sign in
            </T>
          </View>
        </>
      }>
      <View style={{ alignItems: 'center', paddingTop: Spacing.lg }}>
        <Logo size={112} />
      </View>
      <Gap size={Spacing.xl} />
      <T variant="display">A place for your loose threads.</T>
      <Gap />
      <T muted>Capture thoughts between sessions. Reflect on what matters. Carry it forward.</T>
      <Gap size={Spacing.xl} />
      <Stack gap={Spacing.lg}>
        {features.map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name={f.icon} size={22} color={c.text} />
            <T>{f.text}</T>
          </View>
        ))}
      </Stack>
    </Screen>
  );
}
