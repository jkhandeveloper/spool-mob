import { Platform } from 'react-native';
import { DateTimeField } from '@/components/date-time-field';
import { Card, Gap, InlineError, Screen, Stack, T, ToggleRow } from '@/components/ui';
import { useUpdateMe } from '@/hooks/use-update-me';
import { useAuth } from '@/lib/auth';

export default function Reminders() {
  const { user } = useAuth();
  const update = useUpdateMe();
  const [h, m] = (user?.reminderTime ?? '20:00').split(':').map(Number);
  const time = new Date();
  time.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Screen back>
      <T variant="title">Reminders</T>
      <T muted>A gentle daily nudge to journal or take a moment for yourself.</T>
      <Gap />
      <Stack>
        <ToggleRow
          label="Daily check-in"
          value={!!user?.remindersEnabled}
          onChange={(v) => update.mutate({ remindersEnabled: v })}
        />
        {user?.remindersEnabled ? (
          <DateTimeField
            label="Time"
            mode="time"
            value={time}
            onChange={(d) => update.mutate({ reminderTime: `${pad(d.getHours())}:${pad(d.getMinutes())}` })}
          />
        ) : null}
        <InlineError message={update.error?.message} />
        <Card muted>
          <T variant="caption" muted>
            Appointment reminders are set on each appointment.
            {Platform.OS === 'web' ? ' Notifications are only available in the mobile app.' : ' If reminders don’t arrive, check that notifications are allowed for Spool in Settings.'}
          </T>
        </Card>
      </Stack>
    </Screen>
  );
}
