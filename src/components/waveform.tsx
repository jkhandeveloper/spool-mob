import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

/** Simple level meter shown while listening (03 Live session). */
export function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  const c = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={active ? 'Listening' : 'Not listening'}
      style={{ height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {levels.map((v, i) => (
        <View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            height: 4 + (active ? v : 0) * 56,
            backgroundColor: c.text,
            opacity: active ? 0.35 + v * 0.65 : 0.25,
          }}
        />
      ))}
    </View>
  );
}
