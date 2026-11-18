import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, ErrorState, Gap, ListRow, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { DAY_PERIODS, useDayPeriod } from '@/hooks/use-day-period';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

const minutes = (seconds: number) => Math.round(seconds / 60);

export default function Meditations() {
  const c = useTheme();
  const period = useDayPeriod();
  const q = useQuery({ queryKey: ['meditations'], queryFn: api.meditations.list, staleTime: Infinity });

  const current = q.data?.find((m) => m.allDay && m.timeOfDay === period);
  const others = q.data?.filter((m) => !m.allDay) ?? [];
  const periodLabel = DAY_PERIODS.find((p) => p.period === period)?.label ?? '';

  return (
    <Screen back>
      <T variant="title">Meditations</T>
      <Gap />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          {current ? (
            <Section
              title="All day meditation"
              subtitle={DAY_PERIODS.map((p) => `${p.label} from ${p.starts}`).join(' · ')}>
              <Card
                inverted
                onPress={() => router.push(`/meditation/${current.id}`)}
                accessibilityLabel={`${periodLabel} meditation: ${current.title}, ${minutes(current.durationSeconds)} minutes. Play`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <T variant="label" style={{ color: c.onPrimary }}>
                      {periodLabel} meditation · now
                    </T>
                    <T variant="bodyStrong" style={{ color: c.onPrimary }}>{current.title}</T>
                    <T variant="caption" style={{ color: c.onPrimary }}>
                      {current.subtitle} · {minutes(current.durationSeconds)} min
                    </T>
                  </View>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: Radius.pill,
                      backgroundColor: c.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="play" size={18} color={c.text} />
                  </View>
                </View>
              </Card>
            </Section>
          ) : null}
          <Section title="More meditations">
            <Stack>
              {others.map((m) => (
                <ListRow
                  key={m.id}
                  icon="leaf-outline"
                  title={m.title}
                  subtitle={`${m.subtitle} · ${minutes(m.durationSeconds)} min`}
                  onPress={() => router.push(`/meditation/${m.id}`)}
                />
              ))}
            </Stack>
          </Section>
        </>
      )}
    </Screen>
  );
}
