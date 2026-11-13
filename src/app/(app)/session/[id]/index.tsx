import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { EditableCard } from '@/components/editable-card';
import { Button, ErrorState, Gap, InlineError, ListRow, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { useAuth } from '@/lib/auth';
import { formatDuration, formatLongDate } from '@/lib/format';

// 04 Saved session summary: main points, takeaways, goals
export default function SessionSummary() {
  const { id, justSaved } = useLocalSearchParams<{ id: string; justSaved?: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['session', id], queryFn: () => api.sessions.get(id) });

  const update = useMutation({
    mutationFn: (b: Parameters<typeof api.sessions.update>[1]) => api.sessions.update(id, b),
    onSuccess: (s) => {
      qc.setQueryData(['session', id], s);
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api.sessions.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      router.back();
    },
  });

  const confirmDelete = () =>
    confirm({ title: 'Delete this summary?', message: 'Your goals stay, but this summary will be removed. This cannot be undone.', confirmText: 'Delete', onConfirm: () => remove.mutate() });

  const back = justSaved ? () => router.replace('/sessions') : true;
  if (q.isPending) return <Screen back={back}><Loading /></Screen>;
  if (q.isError) return <Screen back={back}><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const s = q.data;

  return (
    <Screen
      back={back}
      footer={
        user?.graduatedAt ? undefined : (
          <Button title="Plan next appointment" onPress={() => router.push('/appointment/new')} />
        )
      }>
      <T variant="title">{s.title ?? 'Your session'}</T>
      <T variant="caption" muted>
        Session summary · {formatLongDate(s.createdAt)}
        {s.durationSeconds ? ` · ${formatDuration(s.durationSeconds)}` : ''}
      </T>
      {s.topics.length ? <T variant="caption" muted>{s.topics.join(' · ')}</T> : null}

      {/* The card carries the "Main points" heading and its edit button, so no Section title here. */}
      <Gap size={Spacing.xl} />
      <EditableCard title="Main points" items={s.mainPoints} onSave={(mainPoints) => update.mutateAsync({ mainPoints })} saving={update.isPending} />

      <Section title="Key takeaways" subtitle="Small steps create meaningful change.">
        <Stack>
          {s.takeaways.map((t) => (
            <T key={t}>• {t}</T>
          ))}
          <Gap size={Spacing.xs} />
          {s.dailyGoal ? <ListRow icon="radio-button-on-outline" title="Daily goal" subtitle={s.dailyGoal} onPress={() => router.push('/goals')} /> : null}
          {s.weeklyGoal ? <ListRow icon="calendar-outline" title="Weekly goal" subtitle={s.weeklyGoal} onPress={() => router.push('/goals')} /> : null}
        </Stack>
      </Section>

      {s.prompts.length ? (
        <Section title="You wanted to talk about">
          <View style={{ gap: Spacing.xs }}>
            {s.prompts.map((p) => (
              <T key={p} variant="caption">• {p}</T>
            ))}
          </View>
        </Section>
      ) : null}

      <Gap size={Spacing.xl} />
      <InlineError message={update.error?.message ?? remove.error?.message} />
      <Button title="Delete summary" variant="ghost" onPress={confirmDelete} loading={remove.isPending} />
    </Screen>
  );
}
