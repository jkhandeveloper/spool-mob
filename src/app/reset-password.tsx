import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAction } from '@/hooks/use-action';
import { api } from '@/lib/api';

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const action = useAction(async () => {
    if (!token.trim()) throw new Error('Paste the code from your email.');
    if (password.length < 8) throw new Error('Use at least 8 characters for your new password.');
    await api.auth.resetPassword(token.trim(), password);
    setDone(true);
  });

  if (done) {
    return (
      <Screen footer={<Button title="Sign in" onPress={() => router.replace('/sign-in')} />}>
        <T variant="title">Password updated</T>
        <Gap />
        <Card muted>
          <T>You can now sign in with your new password. For your security, other devices have been signed out.</T>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen back footer={<Button title="Set new password" onPress={action.run} loading={action.pending} />}>
      <T variant="title">Choose a new password</T>
      <Gap size={Spacing.xl} />
      <Stack gap={Spacing.lg}>
        {!params.token ? (
          <Field label="Reset code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
        ) : null}
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="At least 8 characters"
        />
        <InlineError message={action.error} />
      </Stack>
    </Screen>
  );
}
