import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, EmptyState, ErrorState, Gap, ListRow, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { appointmentSubtitle, sameDay } from '@/lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 10 Calendar
export default function CalendarScreen() {
  const c = useTheme();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(null);

  const from = month;
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const q = useQuery({
    queryKey: ['appointments', from.toISOString()],
    queryFn: () => api.appointments.list(from, to),
  });
  const upcomingQ = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => api.appointments.list(new Date(), new Date(Date.now() + 120 * 86_400_000)),
  });

  const cells = useMemo(() => {
    const lead = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);

  const appts = q.data ?? [];
  const hasAppt = (day: number) =>
    appts.some((a) => sameDay(new Date(a.startsAt), new Date(month.getFullYear(), month.getMonth(), day)));

  const listed = selected
    ? appts.filter((a) => sameDay(new Date(a.startsAt), selected))
    : (upcomingQ.data ?? []).slice(0, 5);

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const shift = (delta: number) => {
    setSelected(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };

  return (
    <Screen
      refreshing={q.isRefetching}
      onRefresh={() => {
        q.refetch();
        upcomingQ.refetch();
      }}
      footer={<Button title="Add appointment" icon="add" onPress={() => router.push('/appointment/new')} />}>
      <T variant="title">Calendar</T>
      <Gap />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <T variant="bodyStrong" accessibilityLiveRegion="polite">{monthLabel}</T>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={22} color={c.text} />
        </Pressable>
      </View>
      <Gap />
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d) => (
          <T key={d} variant="caption" muted center style={{ width: `${100 / 7}%` }}>{d}</T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.xs }}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const isSelected = selected && sameDay(selected, date);
          const marked = hasAppt(day);
          const isToday = sameDay(date, today);
          return (
            <Pressable
              key={day}
              onPress={() => setSelected(isSelected ? null : date)}
              accessibilityRole="button"
              accessibilityState={{ selected: !!isSelected }}
              accessibilityLabel={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${marked ? ', has appointment' : ''}`}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: Radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: marked || isSelected ? c.primary : 'transparent',
                  borderWidth: isToday && !marked && !isSelected ? 1 : 0,
                  borderColor: c.text,
                }}>
                <T style={{ color: marked || isSelected ? c.onPrimary : c.text, fontWeight: marked ? '800' : '400' }}>
                  {day}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Section title={selected ? selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Upcoming'}>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.isPending || upcomingQ.isPending ? (
          <Loading />
        ) : listed.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={selected ? 'Nothing on this day' : 'No upcoming appointments'}
            body="Add your next session so Spool can remind you."
          />
        ) : (
          <Stack>
            {listed.map((a) => (
              <ListRow
                key={a.id}
                title={a.title}
                subtitle={`${new Date(a.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(a.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}\n${appointmentSubtitle(a)}`}
                onPress={() => router.push(`/appointment/${a.id}`)}
              />
            ))}
          </Stack>
        )}
      </Section>
    </Screen>
  );
}
