import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AppointmentForm, draftFrom, toPayload, type AppointmentDraft } from '@/components/appointment-form';
import { Button, Card, ErrorState, Gap, InlineError, Loading, Screen, Stack, T } from '@/components/ui';
import { api } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { KIND_LABEL, formatLongDate, formatTime } from '@/lib/format';
import { cancelAppointmentReminder, syncAppointmentReminder } from '@/lib/notifications';

// P7 Appointment details: view, edit, cancel, reminder
export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['appointment', id], queryFn: () => api.appointments.get(id) });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [now] = useState(Date.now);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const save = useMutation({
    mutationFn: () => api.appointments.update(id, toPayload(draft!)),
    onSuccess: (appt) => {
      syncAppointmentReminder(appt).catch(() => undefined);
      qc.setQueryData(['appointment', id], appt);
      refresh();
      setEditing(false);
    },
  });

  const cancel = useMutation({
    mutationFn: () => api.appointments.cancel(id),
    onSuccess: () => {
      cancelAppointmentReminder(id).catch(() => undefined);
      refresh();
      router.back();
    },
  });

  const confirmCancel = () =>
    confirm({ title: 'Cancel this appointment?', message: 'It will be removed from your calendar.', confirmText: 'Cancel appointment', cancelText: 'Keep it', onConfirm: () => cancel.mutate() });

  if (q.isError) return <Screen back><ErrorState error={q.error} onRetry={() => q.refetch()} /></Screen>;
  if (q.isPending) return <Screen back><Loading /></Screen>;
  const a = q.data;
  const past = new Date(a.startsAt).getTime() + a.durationMinutes * 60_000 < now;

  if (editing && draft) {
    return (
      <Screen back={() => setEditing(false)}>
        <T variant="title">Edit appointment</T>
        <Gap />
        <AppointmentForm draft={draft} onChange={setDraft} />
        <Gap />
        <InlineError message={save.error?.message} />
        <Gap size={8} />
        <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} />
      </Screen>
    );
  }

  return (
    <Screen back>
      <T variant="title">{a.title}</T>
      <Gap />
      <Card muted>
        <Stack>
          <T variant="bodyStrong">{formatLongDate(a.startsAt)} · {formatTime(a.startsAt)}</T>
          <T>{KIND_LABEL[a.kind]}{a.location ? ` · ${a.location}` : ''}</T>
          <T variant="caption" muted>
            {a.reminderMinutesBefore == null
              ? 'No reminder'
              : a.reminderMinutesBefore >= 1440
                ? 'Reminder 1 day before'
                : `Reminder ${a.reminderMinutesBefore} minutes before`}
          </T>
          {a.notes ? <T>{a.notes}</T> : null}
        </Stack>
      </Card>
      <Gap size={24} />
      <InlineError message={cancel.error?.message} />
      <Stack>
        {!past ? <Button title="Edit" variant="secondary" icon="create-outline" onPress={() => {
              setDraft(draftFrom(a));
              setEditing(true);
            }} /> : null}
        <Button title="Thought journal" variant="secondary" icon="document-text-outline" onPress={() => router.push('/journal')} />
        {!past ? <Button title="Cancel appointment" variant="ghost" onPress={confirmCancel} loading={cancel.isPending} /> : null}
      </Stack>
    </Screen>
  );
}
