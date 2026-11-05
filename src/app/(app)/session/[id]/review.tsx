import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { EditableCard, GoalsCard } from '@/components/editable-card';
import { Button, Card, Checkbox, ErrorState, Gap, InlineError, Loading, Screen, Stack, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { formatLongDate } from '@/lib/format';
import type { TherapySession } from '@/lib/types';

// 12 Review summary: correct text, edit goals, keep/discard
export default function ReviewSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [keep, setKeep] = useState(true);
  const q = useQuery({ queryKey: ['session', id], queryFn: () => api.sessions.get(id) });

  const update = useMutation({
    mutationFn: (b: Parameters<typeof api.sessions.update>[1]) => api.sessions.update(id, b),
    onSuccess: (s) => qc.setQueryData(['session', id], s),
  });

  const invalidate = () =>
    Promise.all(['sessions', 'today', 'goals'].map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const save = useMutation({
    mutationFn: () => api.sessions.save(id, keep),
    onSuccess: async ({ session }) => {
      await invalidate();
      if (session) router.replace({ pathname: '/session/[id]', params: { id: session.id, justSaved: '1' } });
      else router.replace('/');
    },
  });

  const discard = useMutation({
    mutationFn: () => api.sessions.remove(id),
    onSuccess: async () => {
      await invalidate();
      router.replace('/sessions');
    },
  });

  const confirmDiscard = () =>
    confirm({ title: 'Discard this draft?', message: 'The summary and goals from this session will not be saved.', confirmText: 'Discard', onConfirm: () => discard.mutate() });

  if (q.isPending) return <Screen back><Loading /></Screen>;
  if (q.isError) return <Screen back><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const s: TherapySession = q.data;
  if (s.status !== 'draft') {
    return (
      <Screen back>
        <ErrorState error={new Error('This summary has already been reviewed.')} onRetry={() => router.replace(`/session/${s.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen
      back
      footer={
        <>
          <InlineError message={save.error?.message ?? discard.error?.message ?? update.error?.message} />
          <Button title="Save summary" onPress={() => save.mutate()} loading={save.isPending} disabled={discard.isPending} />
          <Button title="Discard draft" variant="ghost" onPress={confirmDiscard} loading={discard.isPending} />
        </>
      }>
      <T variant="title">Review your summary</T>
      <T variant="caption">{formatLongDate(s.createdAt)}</T>
      <Gap />
      <Stack>
        <Card muted>
          <T variant="caption">A draft for you to review. Edit anything that doesn't feel right.</T>
        </Card>
        <EditableCard
          title="Title"
          items={s.title ? [s.title] : []}
          maxItems={1}
          saving={update.isPending}
          onSave={([title]) => (title ? update.mutateAsync({ title }) : undefined)}
        />
        <EditableCard
          title="Main points"
          items={s.mainPoints}
          saving={update.isPending}
          onSave={(mainPoints) => update.mutateAsync({ mainPoints })}
        />
        <EditableCard
          title={s.takeaways.length > 1 ? 'Key takeaways' : 'Key takeaway'}
          items={s.takeaways}
          saving={update.isPending}
          onSave={(takeaways) => update.mutateAsync({ takeaways })}
        />
        <GoalsCard
          daily={s.dailyGoal}
          weekly={s.weeklyGoal}
          saving={update.isPending}
          onSave={(g) => update.mutateAsync(g)}
        />
        <Checkbox checked={keep} onChange={setKeep} label="Keep this summary" />
        {!keep ? (
          <T variant="caption" muted>Your goals will still be saved, but this summary won't appear in your session history.</T>
        ) : null}
      </Stack>
    </Screen>
  );
}
