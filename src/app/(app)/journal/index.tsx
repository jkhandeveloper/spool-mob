import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button, EmptyState, ErrorState, ListRow, Loading, Screen, Stack, T, Gap } from '@/components/ui';
import { api } from '@/lib/api';
import { formatShortDate } from '@/lib/format';

// 06 Thought journal (journal list)
export default function JournalList() {
  const q = useQuery({ queryKey: ['journal'], queryFn: api.journal.list });

  return (
    <Screen
      back
      refreshing={q.isRefetching}
      onRefresh={() => q.refetch()}
      footer={<Button title="Add entry" icon="add" onPress={() => router.push('/journal/new')} />}>
      <T variant="title">Thought journal</T>
      <Gap />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Nothing here yet"
          body="Jot down what's on your mind. Notes you write this week become discussion prompts for your next session."
        />
      ) : (
        <Stack>
          {q.data.items.map((e) => (
            <ListRow
              key={e.id}
              eyebrow={formatShortDate(e.createdAt) + (e.includeInPrompts ? '' : ' · PRIVATE')}
              title={e.title}
              subtitle={e.body}
              onPress={() => router.push(`/journal/${e.id}`)}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
