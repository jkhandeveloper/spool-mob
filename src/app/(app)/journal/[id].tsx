import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ErrorState, Field, Gap, InlineError, Loading, Screen, Stack, T, ToggleRow } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { formatLongDate } from '@/lib/format';

// P6 Journal entry detail: read, edit, delete, include/exclude from session prompts
export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['journal', id], queryFn: () => api.journal.get(id) });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['journal'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const update = useMutation({
    mutationFn: (b: Parameters<typeof api.journal.update>[1]) => api.journal.update(id, b),
    onSuccess: (entry) => {
      qc.setQueryData(['journal', id], entry);
      refresh();
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.journal.remove(id),
    onSuccess: () => {
      refresh();
      router.back();
    },
  });

  const confirmDelete = () =>
    confirm({ title: 'Delete this entry?', message: 'This cannot be undone.', confirmText: 'Delete', onConfirm: () => remove.mutate() });

  if (q.isPending) return <Screen back><Loading /></Screen>;
  if (q.isError) return <Screen back><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const entry = q.data;

  return (
    <Screen back>
      <T variant="caption" muted>{formatLongDate(entry.createdAt)}</T>
      {editing ? (
        <Stack>
          <Field label="Title" value={title} onChangeText={setTitle} maxLength={120} />
          <Field label="Entry" value={body} onChangeText={setBody} multiline style={{ minHeight: 220 }} />
          <InlineError message={update.error?.message} />
          <Button
            title="Save changes"
            onPress={() => update.mutate({ title: title.trim(), body: body.trim() })}
            loading={update.isPending}
            disabled={!title.trim() || !body.trim()}
          />
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </Stack>
      ) : (
        <>
          <T variant="title">{entry.title}</T>
          <Gap />
          <T selectable>{entry.body}</T>
          <Gap size={24} />
          <Card muted>
            <ToggleRow
              label="Use as a discussion prompt"
              hint={entry.includeInPrompts ? 'This note will be offered during your next session.' : 'This note stays private to your journal.'}
              value={entry.includeInPrompts}
              onChange={(v) => update.mutate({ includeInPrompts: v })}
            />
          </Card>
          <Gap />
          <InlineError message={update.error?.message ?? remove.error?.message} />
          <Gap size={8} />
          <Stack>
            <Button title="Edit" variant="secondary" icon="create-outline" onPress={() => {
                setTitle(entry.title);
                setBody(entry.body);
                setEditing(true);
              }}
            />
            <Button title="Delete entry" variant="ghost" onPress={confirmDelete} loading={remove.isPending} />
          </Stack>
        </>
      )}
    </Screen>
  );
}
