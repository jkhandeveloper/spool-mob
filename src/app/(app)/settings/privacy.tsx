import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Share } from 'react-native';
import { PrivacyDetails } from '@/components/privacy-details';
import { Button, Card, Gap, InlineError, Screen, Section, Stack, T, ToggleRow } from '@/components/ui';
import { useUpdateMe } from '@/hooks/use-update-me';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';

// P9 Data & privacy details + controls
export default function PrivacySettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const update = useUpdateMe();

  const exportData = useMutation({
    mutationFn: api.me.export,
    onSuccess: (data) =>
      Share.share({ title: 'My Spool data', message: JSON.stringify(data, null, 2) }),
  });

  const deleteData = useMutation({
    mutationFn: api.me.deleteData,
    onSuccess: () => {
      qc.invalidateQueries();
      notify('Your data was deleted', 'Your journal, sessions, goals and appointments have been removed.');
    },
  });

  const confirmDeleteData = () =>
    confirm({
      title: 'Delete all your data?',
      message:
        'This removes every journal entry, session summary, goal and appointment. Your account stays. This cannot be undone.',
      confirmText: 'Delete everything',
      onConfirm: () => deleteData.mutate(),
    });

  return (
    <Screen back>
      <T variant="title">Privacy & data</T>
      <Gap />
      <Card muted>
        <ToggleRow
          label="Session recording"
          hint={user?.journalOnly ? 'Off: you are using journals without recording.' : 'On: you can start a session from the Session tab.'}
          value={!user?.journalOnly}
          onChange={(on) => update.mutate({ journalOnly: !on })}
        />
      </Card>
      <InlineError message={update.error?.message} />

      <Section title="How Spool handles your information">
        <PrivacyDetails initiallyOpen="recording" />
      </Section>

      <Section title="Your data">
        <Stack>
          <InlineError message={exportData.error?.message ?? deleteData.error?.message} />
          <Button title="Export my data" variant="secondary" icon="download-outline" onPress={() => exportData.mutate()} loading={exportData.isPending} />
          <Button title="Delete all my data" variant="secondary" onPress={confirmDeleteData} loading={deleteData.isPending} />
          <Button title="Delete my account" variant="ghost" onPress={() => router.push('/settings/account')} />
        </Stack>
      </Section>
    </Screen>
  );
}
