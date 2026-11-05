import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { useUpdateMe } from '@/hooks/use-update-me';
import { useAuth } from '@/lib/auth';

export default function Profile() {
  const { user } = useAuth();
  const update = useUpdateMe();
  const [name, setName] = useState(user?.displayName ?? '');

  return (
    <Screen back>
      <T variant="title">Profile</T>
      <Gap />
      <Stack>
        <Field label="Name" value={name} onChangeText={setName} maxLength={80} autoComplete="given-name" />
        <Field label="Email" value={user?.email ?? ''} editable={false} hint="Contact support to change your email." />
        <InlineError message={update.error?.message} />
        <Button
          title="Save"
          loading={update.isPending}
          onPress={() => update.mutate({ displayName: name.trim() || null }, { onSuccess: () => router.back() })}
        />
      </Stack>
    </Screen>
  );
}
