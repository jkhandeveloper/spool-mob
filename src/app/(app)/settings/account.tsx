import { useState } from 'react';
import { Button, Card, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { useAction } from '@/hooks/use-action';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// P2: account deletion
export default function DeleteAccount() {
  const { clearSession } = useAuth();
  const [password, setPassword] = useState('');

  const action = useAction(async () => {
    if (!password) throw new Error('Enter your password to confirm.');
    await api.me.deleteAccount(password);
    await clearSession();
  });

  return (
    <Screen back>
      <T variant="title">Delete account</T>
      <Gap />
      <Card muted>
        <T>
          This permanently deletes your account and everything in it: journal entries, session summaries, goals,
          check-ins and appointments. This cannot be undone.
        </T>
      </Card>
      <Gap />
      <T variant="caption" muted>Want a copy first? Use Export my data in Privacy & data.</T>
      <Gap />
      <Stack>
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <InlineError message={action.error} />
        <Button title="Delete my account" variant="danger" onPress={action.run} loading={action.pending} />
      </Stack>
    </Screen>
  );
}
