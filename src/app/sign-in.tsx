import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAction } from '@/hooks/use-action';
import { useAuth } from '@/lib/auth';

// P1 Account access: sign in
export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction(async () => {
    if (!email.trim() || !password) throw new Error('Enter your email and password.');
    await signIn(email, password);
  });

  return (
    <Screen back footer={<Button title="Sign in" onPress={action.run} loading={action.pending} />}>
      <T variant="title">Welcome back</T>
      <Gap size={Spacing.xl} />
      <Stack gap={Spacing.lg}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={() => action.run()}
        />
        <InlineError message={action.error} />
        <T
          variant="caption"
          style={{ fontWeight: '700' }}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}>
          Forgot your password?
        </T>
      </Stack>
    </Screen>
  );
}
