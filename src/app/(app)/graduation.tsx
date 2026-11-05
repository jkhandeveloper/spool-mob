import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Gap, InlineError, Screen, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cancelAllReminders, syncDailyReminder } from '@/lib/notifications';

// P8 Graduation: celebrate, adjust reminders, explain ongoing access
export default function Graduation() {
  const c = useTheme();
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const graduated = !!user?.graduatedAt;

  const refresh = () =>
    ['today', 'appointments'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const graduate = useMutation({
    mutationFn: api.me.graduate,
    onSuccess: async (u) => {
      // Appointment reminders no longer apply; keep the daily check-in if they want it.
      await cancelAllReminders().catch(() => undefined);
      setUser(u);
      refresh();
    },
  });

  const keepReminders = useMutation({
    mutationFn: (enabled: boolean) => api.me.update({ remindersEnabled: enabled }),
    onSuccess: (u) => {
      setUser(u);
      syncDailyReminder(u).catch(() => undefined);
      router.dismissTo('/');
    },
  });

  const resume = useMutation({
    mutationFn: api.me.resume,
    onSuccess: (u) => {
      setUser(u);
      refresh();
      router.back();
    },
  });

  const justGraduated = graduate.isSuccess;

  return (
    <Screen back>
      <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
        <Ionicons name="school-outline" size={64} color={c.text} />
      </View>
      {!graduated ? (
        <>
          <T variant="title" center>Ready to graduate?</T>
          <Gap />
          <T center muted>
            Finishing therapy is a real milestone. When you graduate, upcoming appointments are cleared, but everything
            you've written and saved stays with you.
          </T>
          <Gap size={Spacing.xl} />
          <InlineError message={graduate.error?.message} />
          <Gap size={8} />
          <Button title="I've graduated!" onPress={() => graduate.mutate()} loading={graduate.isPending} />
          <Button title="Not yet" variant="ghost" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <T variant="title" center>{justGraduated ? 'Congratulations 🎉' : "You've graduated"}</T>
          <Gap />
          <T center muted>
            You did the work. Spool is still here for the loose threads: your journal, past summaries, goals and
            meditations remain available, for as long as you keep your account.
          </T>
          <Gap size={Spacing.xl} />
          <Card muted>
            <Stack>
              <T variant="bodyStrong">Keep a gentle daily check-in?</T>
              <T variant="caption" muted>A short reminder to journal or take a moment for yourself. You can change this anytime.</T>
            </Stack>
          </Card>
          <Gap />
          <InlineError message={keepReminders.error?.message ?? resume.error?.message} />
          <Gap size={8} />
          <Stack>
            <Button title="Keep daily reminders" onPress={() => keepReminders.mutate(true)} loading={keepReminders.isPending} />
            <Button title="Turn reminders off" variant="secondary" onPress={() => keepReminders.mutate(false)} disabled={keepReminders.isPending} />
            <Button title="I'm returning to therapy" variant="ghost" onPress={() => resume.mutate()} loading={resume.isPending} />
          </Stack>
        </>
      )}
    </Screen>
  );
}
