import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button, Card, EmptyState, ErrorState, Gap, ListRow, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatLongDate } from '@/lib/format';

// 11 Your sessions (session history)
export default function SessionsScreen() {
  const { user } = useAuth();
  const saved = useQuery({ queryKey: ['sessions'], queryFn: api.sessions.list });
  const pending = useQuery({ queryKey: ['sessions', 'pending'], queryFn: api.sessions.pending });

  const journalOnly = !!user?.journalOnly;
  const footer = journalOnly ? undefined : (
    <Button title="Start a new session" icon="mic-outline" onPress={() => router.push('/session/new')} />
  );

  return (
    <Screen
      footer={footer}
      refreshing={saved.isRefetching}
      onRefresh={() => {
        saved.refetch();
        pending.refetch();
      }}>
      <T variant="title">Your sessions</T>
      <T muted>Pick up where you left off.</T>
      <Gap />

      {journalOnly ? (
        <>
          <Card muted>
            <T variant="bodyStrong">Session recording is off</T>
            <T variant="caption" muted>You chose to use journals without recording. You can turn recording on in More → Privacy & data.</T>
          </Card>
          <Gap />
        </>
      ) : null}

      {pending.data?.length ? (
        <Section title="Waiting for you">
          <Stack>
            {pending.data.map((s) => (
              <ListRow
                key={s.id}
                icon={s.status === 'failed' ? 'alert-circle-outline' : 'document-text-outline'}
                eyebrow={formatLongDate(s.createdAt)}
                title={s.status === 'draft' ? 'Review your summary' : s.status === 'failed' ? "Summary didn't finish" : 'Creating your summary…'}
                subtitle={s.status === 'failed' ? s.failureReason : undefined}
                onPress={() => router.push(s.status === 'draft' ? `/session/${s.id}/review` : `/session/${s.id}/processing`)}
              />
            ))}
          </Stack>
        </Section>
      ) : null}

      {saved.isPending ? (
        <Loading />
      ) : saved.isError ? (
        <ErrorState error={saved.error} onRetry={() => saved.refetch()} />
      ) : saved.data.length === 0 ? (
        <EmptyState
          icon="mic-outline"
          title="No sessions yet"
          body={journalOnly ? 'Your journal is ready whenever you are.' : 'After your next session, your summary will appear here.'}
        />
      ) : (
        <Stack>
          {saved.data.map((s) => (
            <ListRow
              key={s.id}
              eyebrow={formatLongDate(s.createdAt)}
              title={s.title ?? 'Session'}
              subtitle={s.topics.join(' · ') || undefined}
              onPress={() => router.push(`/session/${s.id}`)}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
