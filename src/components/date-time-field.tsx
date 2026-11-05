import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate, formatTime } from '@/lib/format';

/** A labelled row like the 05 mockup ("Date   November 12, 2026  [icon]"). */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
}: {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
}) {
  const c = useTheme();
  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    gap: Spacing.md,
  };
  const labelEl = <T variant="bodyStrong" style={{ width: 80 }}>{label}</T>;
  const icon = <Ionicons name={mode === 'date' ? 'calendar-clear-outline' : 'time-outline'} size={20} color={c.text} />;

  if (Platform.OS === 'ios') {
    return (
      <View style={rowStyle}>
        {labelEl}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <DateTimePicker
            value={value}
            mode={mode}
            display="compact"
            minuteInterval={5}
            accessibilityLabel={label}
            onChange={(_, d) => d && onChange(d)}
          />
        </View>
        {icon}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${mode === 'date' ? formatLongDate(value) : formatTime(value)}. Change`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value,
            mode,
            onChange: (e, d) => {
              if (e.type === 'set' && d) onChange(d);
            },
          })
        }
        style={rowStyle}>
        {labelEl}
        <T style={{ flex: 1 }}>{mode === 'date' ? formatLongDate(value) : formatTime(value)}</T>
        {icon}
      </Pressable>
    );
  }

  // Web (development): plain text input in a predictable format.
  const pad = (n: number) => String(n).padStart(2, '0');
  const text =
    mode === 'date'
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return (
    <View style={rowStyle}>
      {labelEl}
      <TextInput
        defaultValue={text}
        accessibilityLabel={label}
        placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
        style={{ flex: 1, color: c.text, fontSize: 16 }}
        onEndEditing={(e) => {
          const v = e.nativeEvent.text;
          const next = new Date(value);
          if (mode === 'date') {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
            if (m) next.setFullYear(+m[1], +m[2] - 1, +m[3]);
          } else {
            const m = /^(\d{1,2}):(\d{2})$/.exec(v);
            if (m) next.setHours(+m[1], +m[2]);
          }
          onChange(next);
        }}
      />
      {icon}
    </View>
  );
}
