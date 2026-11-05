import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { EmptyState, ErrorState, Gap, ListRow, Loading, Screen, Stack, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

export default function Goals() {
  const c = useTheme();
  const q = useQuery({ queryKey: ['goals'], queryFn: api.goals.list });
  return (
    <Screen back refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <T variant="title">Your goals</T>
      <T muted>Small steps create meaningful change.</T>
      <Gap />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState icon="flag-outline" title="No goals right now" body="Goals from your next session summary will show up here." />
      ) : (
        <Stack>
          {q.data.map((g) => (
            <ListRow
              key={g.id}
              icon={g.cadence === 'daily' ? 'radio-button-on-outline' : 'calendar-outline'}
              title={g.cadence === 'daily' ? 'Daily goal' : 'Weekly goal'}
              subtitle={g.text}
              onPress={() => router.push(`/goal/${g.id}`)}
              right={g.doneThisPeriod ? <Ionicons name="checkmark-circle" size={24} color={c.success} accessibilityLabel="Done for now" /> : undefined}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
