import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAction } from '@/hooks/use-action';
import { useAuth } from '@/lib/auth';

// P1 Account access: create account
export default function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const emailError = touched && !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Enter a valid email address' : null;
  const passwordError = touched && password.length < 8 ? 'Use at least 8 characters' : null;

  const action = useAction(async () => {
    setTouched(true);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8) return;
    await signUp(email, password, name);
  });

  return (
    <Screen back footer={<Button title="Create account" onPress={action.run} loading={action.pending} />}>
      <T variant="title">Create your account</T>
      <T muted>Your journal and summaries stay private to you.</T>
      <Gap size={Spacing.xl} />
      <Stack gap={Spacing.lg}>
        <Field
          label="What should we call you? (optional)"
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
          textContentType="givenName"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          hint="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => action.run()}
        />
        <InlineError message={action.error} />
        <T variant="caption" muted center onPress={() => router.replace('/sign-in')} accessibilityRole="link">
          Already have an account? Sign in
        </T>
      </Stack>
    </Screen>
  );
}
