import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Appointment, User } from './types';

const DAILY_ID = 'spool-daily-reminder';
const apptId = (id: string) => `spool-appt-${id}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const supported = Platform.OS !== 'web';

async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules (or clears) the gentle daily check-in based on the user's settings. */
export async function syncDailyReminder(user: Pick<User, 'remindersEnabled' | 'reminderTime'>) {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
  if (!user.remindersEnabled || !user.reminderTime) return;
  if (!(await ensurePermission())) return;
  const [hour, minute] = user.reminderTime.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: 'Spool', body: 'A moment for you. How are you feeling today?' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function syncAppointmentReminder(appt: Appointment) {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(apptId(appt.id)).catch(() => undefined);
  if (appt.cancelledAt || appt.reminderMinutesBefore == null) return;
  const at = new Date(appt.startsAt).getTime() - appt.reminderMinutesBefore * 60_000;
  if (at <= Date.now()) return;
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: apptId(appt.id),
    content: {
      title: appt.title,
      body: `Starts at ${new Date(appt.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Your journal notes are ready.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelAppointmentReminder(id: string) {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(apptId(id)).catch(() => undefined);
}

export async function cancelAllReminders() {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
