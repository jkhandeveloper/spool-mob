import { View } from 'react-native';
import { Card, Chip, Gap, InlineError, Screen, Stack, T, ToggleRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useUpdateMe } from '@/hooks/use-update-me';
import { useAuth } from '@/lib/auth';
import type { TextSize } from '@/lib/types';

const SIZES: { value: TextSize; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra large' },
];

export default function Accessibility() {
  const { user } = useAuth();
  const update = useUpdateMe();

  return (
    <Screen back>
      <T variant="title">Accessibility</T>
      <Gap />
      <Stack>
        <T variant="bodyStrong">Text size</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {SIZES.map((s) => (
            <Chip key={s.value} label={s.label} selected={user?.textSize === s.value} onPress={() => update.mutate({ textSize: s.value })} />
          ))}
        </View>
        <Card muted>
          <T>This is how text will look across Spool.</T>
        </Card>
        <ToggleRow
          label="Reduce motion"
          hint="Fewer animations and transitions"
          value={!!user?.reduceMotion}
          onChange={(v) => update.mutate({ reduceMotion: v })}
        />
        <InlineError message={update.error?.message} />
        <T variant="caption" muted>Spool also follows your device's text size, dark mode and screen reader settings.</T>
      </Stack>
    </Screen>
  );
}
