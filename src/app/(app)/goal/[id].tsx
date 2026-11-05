import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ErrorState, Field, Gap, InlineError, Loading, Screen, Section, Stack, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { formatLongDate } from '@/lib/format';

// P4 Goal detail / check-in: review, adjust wording, reflect or mark complete
export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['goal', id], queryFn: () => api.goals.get(id) });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [reflection, setReflection] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['goal', id] });
    qc.invalidateQueries({ queryKey: ['goals'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const update = useMutation({
    mutationFn: (b: { text?: string; completed?: boolean }) => api.goals.update(id, b),
    onSuccess: (_g, vars) => {
      refresh();
      setEditing(false);
      if (vars.completed) router.back();
    },
  });

  const checkIn = useMutation({
    mutationFn: (completed: boolean) => api.goals.checkIn(id, { completed, reflection: reflection.trim() || undefined }),
    onSuccess: () => {
      setReflection('');
      refresh();
    },
  });

  if (q.isPending) return <Screen back><Loading /></Screen>;
  if (q.isError) return <Screen back><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const g = q.data;
  const period = g.cadence === 'daily' ? 'today' : 'this week';

  return (
    <Screen back>
      <T variant="label" muted>{g.cadence === 'daily' ? 'Daily goal' : 'Weekly goal'}</T>
      {editing ? (
        <Stack>
          <Field value={text} onChangeText={setText} multiline maxLength={280} accessibilityLabel="Goal wording" style={{ minHeight: 90 }} />
          <Button title="Save wording" onPress={() => update.mutate({ text: text.trim() })} loading={update.isPending} disabled={!text.trim()} />
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </Stack>
      ) : (
        <>
          <T variant="title">{g.text}</T>
          <Gap size={8} />
          <T
            variant="caption"
            style={{ fontWeight: '700' }}
            accessibilityRole="button"
            onPress={() => {
              setText(g.text);
              setEditing(true);
            }}>
            Adjust wording
          </T>
        </>
      )}

      <Section title={`Check in ${period}`} subtitle={g.doneThisPeriod ? `You've done this ${period}. Nice work.` : 'How did it go?'}>
        <Stack>
          <Field
            placeholder="A short reflection (optional)"
            value={reflection}
            onChangeText={setReflection}
            multiline
            style={{ minHeight: 90 }}
            accessibilityLabel="Reflection"
          />
          <InlineError message={checkIn.error?.message ?? update.error?.message} />
          <Button title={`I did it ${period}`} icon="checkmark" onPress={() => checkIn.mutate(true)} loading={checkIn.isPending && checkIn.variables === true} />
          <Button title="Not this time" variant="secondary" onPress={() => checkIn.mutate(false)} loading={checkIn.isPending && checkIn.variables === false} />
        </Stack>
      </Section>

      {g.checkIns?.length ? (
        <Section title="Recent check-ins">
          <Stack>
            {g.checkIns.slice(0, 10).map((ci) => (
              <Card key={ci.id} muted>
                <T variant="caption" muted>{formatLongDate(ci.createdAt)} · {ci.completed ? 'Done' : 'Not this time'}</T>
                {ci.reflection ? <T>{ci.reflection}</T> : null}
              </Card>
            ))}
          </Stack>
        </Section>
      ) : null}

      <Gap size={24} />
      <Button
        title="Mark goal complete"
        variant="ghost"
        onPress={() =>
          confirm({ title: 'Mark as complete?', message: 'This goal will move out of your active goals.', confirmText: 'Complete', destructive: false, onConfirm: () => update.mutate({ completed: true }) })
        }
      />
    </Screen>
  );
}
