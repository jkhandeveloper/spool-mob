import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAction } from '@/hooks/use-action';
import { api } from '@/lib/api';

// P1 Account access: recovery
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);

  const action = useAction(async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.');
    const res = await api.auth.forgotPassword(email.trim());
    setSent(true);
    // Development builds: the API returns the token directly because no email provider is configured yet.
    if (res.devResetToken) router.replace({ pathname: '/reset-password', params: { token: res.devResetToken } });
  });

  return (
    <Screen
      back
      footer={
        sent ? (
          <Button title="I have a reset code" variant="secondary" onPress={() => router.push('/reset-password')} />
        ) : (
          <Button title="Send reset instructions" onPress={action.run} loading={action.pending} />
        )
      }>
      <T variant="title">Reset your password</T>
      <T muted>Enter the email you signed up with and we'll send you a link.</T>
      <Gap size={Spacing.xl} />
      <Stack gap={Spacing.lg}>
        {sent ? (
          <Card muted>
            <T>If an account exists for {email.trim()}, you'll get an email with instructions shortly.</T>
          </Card>
        ) : (
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={() => action.run()}
          />
        )}
        <InlineError message={action.error} />
      </Stack>
    </Screen>
  );
}
