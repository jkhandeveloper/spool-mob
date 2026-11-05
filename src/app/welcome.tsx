import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Gap, Screen, Stack, T } from '@/components/ui';
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
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 110 }}>
        <Svg width="100%" height="110" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid meet">
          <Path
            d="M0 70 C 60 40, 120 95, 175 70 C 230 45, 225 5, 200 8 C 170 12, 175 75, 230 75 C 270 75, 290 62, 320 66"
            stroke={c.text}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
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
