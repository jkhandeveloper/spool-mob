import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ErrorState, Gap, ListRow, Loading, Screen, Stack, T } from '@/components/ui';
import { api } from '@/lib/api';

export default function Meditations() {
  const q = useQuery({ queryKey: ['meditations'], queryFn: api.meditations.list, staleTime: Infinity });
  return (
    <Screen back>
      <T variant="title">Meditations</T>
      <Gap />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <Stack>
          {q.data.map((m) => (
            <ListRow
              key={m.id}
              icon="leaf-outline"
              title={m.title}
              subtitle={`${m.subtitle} · ${Math.round(m.durationSeconds / 60)} min`}
              onPress={() => router.push(`/meditation/${m.id}`)}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
