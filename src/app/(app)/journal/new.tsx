import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Gap, InlineError, Screen, T, ToggleRow } from '@/components/ui';
import { api } from '@/lib/api';
import { formatLongDate } from '@/lib/format';

const STARTER = "I'm thinking…\nI'm feeling…\nI'm questioning…\n\nI really want to talk about…";

// 07 New entry
export default function NewEntry() {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [includeInPrompts, setInclude] = useState(true);

  const save = useMutation({
    mutationFn: () => api.journal.create({ body: body.trim(), includeInPrompts }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      router.back();
    },
  });

  return (
    <Screen back>
      <T variant="title">Thought journal</T>
      <T variant="caption" muted>{formatLongDate(new Date())}</T>
      <Gap />
      <T variant="heading">Right now…</T>
      <Gap size={8} />
      <Field
        value={body}
        onChangeText={setBody}
        placeholder={STARTER}
        multiline
        autoFocus
        accessibilityLabel="Journal entry"
        accessibilityHint="The first line becomes the title"
        style={{ minHeight: 200 }}
      />
      <Gap />
      <ToggleRow
        label="Use as a discussion prompt"
        hint="Show this note as a prompt during your next session"
        value={includeInPrompts}
        onChange={setInclude}
      />
      <Gap />
      <InlineError message={save.error?.message} />
      <Gap size={8} />
      <Button title="Save entry" onPress={() => save.mutate()} loading={save.isPending} disabled={!body.trim()} />
    </Screen>
  );
}
