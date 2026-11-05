import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppointmentForm, toPayload, useAppointmentDraft } from '@/components/appointment-form';
import { Button, Gap, InlineError, OrDivider, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { syncAppointmentReminder } from '@/lib/notifications';

// 05 Next appointment: save date/time/location or graduate
export default function NewAppointment() {
  const qc = useQueryClient();
  const [draft, setDraft] = useAppointmentDraft();

  const save = useMutation({
    mutationFn: () => {
      if (draft.startsAt.getTime() < Date.now() - 60_000) throw new Error('Choose a date and time in the future.');
      return api.appointments.create(toPayload(draft));
    },
    onSuccess: (appt) => {
      syncAppointmentReminder(appt).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      router.back();
    },
  });

  return (
    <Screen back>
      <T variant="title">Next appointment</T>
      <Gap />
      <AppointmentForm draft={draft} onChange={setDraft} />
      <Gap />
      <InlineError message={save.error?.message} />
      <Gap size={8} />
      <Button title="Save appointment" onPress={() => save.mutate()} loading={save.isPending} />
      <OrDivider />
      <Button title="I've graduated!" variant="secondary" icon="school-outline" onPress={() => router.push('/graduation')} />
    </Screen>
  );
}
