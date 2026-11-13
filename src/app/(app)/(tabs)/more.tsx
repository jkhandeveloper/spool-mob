import { router } from 'expo-router';
import { Linking } from 'react-native';
import { Button, Gap, ListRow, Screen, Section, Stack, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';

// P2 More / settings
export default function MoreScreen() {
  const { user, signOut } = useAuth();

  const confirmSignOut = () =>
    confirm({ title: 'Sign out?', message: 'Your data stays safe in your account.', confirmText: 'Sign out', onConfirm: () => void signOut() });

  return (
    <Screen>
      <T variant="title">More</T>
      <T muted>{user?.displayName ? `Signed in as ${user.displayName} (${user.email})` : user?.email}</T>

      <Section title="You">
        <Stack>
          <ListRow icon="person-outline" title="Profile" subtitle="Name and email" onPress={() => router.push('/settings/profile')} />
          <ListRow
            icon="notifications-outline"
            title="Reminders"
            subtitle={user?.remindersEnabled && user.reminderTime ? `Daily at ${user.reminderTime}` : 'Off'}
            onPress={() => router.push('/settings/reminders')}
          />
          <ListRow icon="text-outline" title="Accessibility" subtitle="Text size and motion" onPress={() => router.push('/settings/accessibility')} />
        </Stack>
      </Section>

      <Section title="Your care">
        <Stack>
          <ListRow icon="flag-outline" title="Goals" subtitle="Daily and weekly steps" onPress={() => router.push('/goals')} />
          <ListRow icon="leaf-outline" title="Meditations" onPress={() => router.push('/meditations')} />
          <ListRow
            icon="school-outline"
            title={user?.graduatedAt ? 'Graduated' : "I've graduated"}
            subtitle={user?.graduatedAt ? 'Your journal and summaries stay with you' : 'Finished therapy? Celebrate it'}
            onPress={() => router.push('/graduation')}
          />
        </Stack>
      </Section>

      <Section title="Privacy">
        <Stack>
          <ListRow
            icon="shield-checkmark-outline"
            title="Privacy & data"
            subtitle={user?.journalOnly ? 'Recording off · export or delete data' : 'Recording, export and deletion'}
            onPress={() => router.push('/settings/privacy')}
          />
        </Stack>
      </Section>

      <Section title="Help">
        <Stack>
          <ListRow
            icon="help-buoy-outline"
            title="If you need support now"
            subtitle="Spool isn't an emergency service. If you're in crisis, contact your local emergency number or a crisis line."
            onPress={() => Linking.openURL('https://findahelpline.com')}
          />
        </Stack>
      </Section>

      <Gap size={32} />
      <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
      <Gap />
      <Button title="Delete account" variant="ghost" onPress={() => router.push('/settings/account')} />
    </Screen>
  );
}
