import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Checkbox, Chip, Field, Gap, InlineError, Screen, Section, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { sessionStore } from '@/lib/session-store';

const CONSENT_SCRIPT = [
  '“I’d like to record this session to help me reflect.',
  'Recordings are not saved, and the transcript is deleted after the summary is created.',
  'If anyone prefers not to be recorded, I will stop.”',
];

// 02 New session: choose prompts, read the consent script, everyone agrees
export default function NewSession() {
  const candidates = useQuery({ queryKey: ['sessions', 'prompts'], queryFn: api.sessions.prompts });
  const [picked, setSelected] = useState<string[] | null>(null);
  const [custom, setCustom] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Pre-select this week's notes (up to 3) until the user changes the selection.
  const selected = picked ?? candidates.data?.slice(0, 3).map((c) => c.prompt) ?? [];

  const toggle = (p: string) =>
    setSelected(selected.includes(p) ? selected.filter((x) => x !== p) : selected.length >= 5 ? selected : [...selected, p]);

  const addCustom = () => {
    const p = custom.trim();
    if (p && !selected.includes(p) && selected.length < 5) setSelected([...selected, p]);
    setCustom('');
  };

  const start = useMutation({
    mutationFn: () => api.sessions.create(selected),
    onSuccess: (session) => {
      sessionStore.setPrompts(session.id, session.prompts);
      router.replace({ pathname: '/session/live', params: { id: session.id } });
    },
  });

  const options = Array.from(new Set([...(candidates.data?.map((c) => c.prompt) ?? []), ...selected]));

  return (
    <Screen
      back
      footer={
        <>
          <InlineError message={start.error?.message} />
          <Button
            title="Start session"
            icon="mic"
            onPress={() => start.mutate()}
            loading={start.isPending}
            disabled={!agreed}
            accessibilityHint="Starts listening. Audio is transcribed on this phone and not saved."
          />
        </>
      }>
      <T variant="title">Before we begin</T>
      <T variant="caption">Read aloud to everyone present</T>
      <Gap />
      <Card muted>
        {CONSENT_SCRIPT.map((line) => (
          <T key={line} style={{ fontStyle: 'italic', marginBottom: Spacing.sm }}>{line}</T>
        ))}
      </Card>
      <Gap size={Spacing.sm} />
      <Checkbox checked={agreed} onChange={setAgreed} label="Everyone has agreed" />

      <Section title="Discussion prompts" subtitle="From your journal this week. Tap to include or leave out.">
        {candidates.isPending ? (
          <T muted>Loading your notes…</T>
        ) : options.length === 0 ? (
          <T muted>No journal notes this week. You can add a prompt below.</T>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {options.map((p) => (
              <Chip key={p} label={p} selected={selected.includes(p)} onPress={() => toggle(p)} />
            ))}
          </View>
        )}
        <Gap />
        <Field
          placeholder="Add something you want to talk about"
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          returnKeyType="done"
          maxLength={200}
        />
        {selected.length >= 5 ? <T variant="caption" muted>You can choose up to 5 prompts.</T> : null}
      </Section>
    </Screen>
  );
}
