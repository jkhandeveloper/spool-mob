import { useState } from 'react';
import { View } from 'react-native';
import { DateTimeField } from '@/components/date-time-field';
import { Chip, Field, Stack, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { KIND_LABEL } from '@/lib/format';
import type { Appointment, AppointmentKind } from '@/lib/types';

const REMINDERS: { label: string; value: number | null }[] = [
  { label: 'None', value: null },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

export interface AppointmentDraft {
  startsAt: Date;
  location: string;
  kind: AppointmentKind;
  reminderMinutesBefore: number | null;
  notes: string;
}

export function draftFrom(a?: Appointment): AppointmentDraft {
  if (a) {
    return {
      startsAt: new Date(a.startsAt),
      location: a.location ?? '',
      kind: a.kind,
      reminderMinutesBefore: a.reminderMinutesBefore,
      notes: a.notes ?? '',
    };
  }
  // Default: same time next week, rounded to the hour — people usually plan this
  // right after a session. Outside daytime hours, suggest 3 PM instead.
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setMinutes(0, 0, 0);
  if (d.getHours() < 8 || d.getHours() > 19) d.setHours(15);
  return { startsAt: d, location: '', kind: 'in_person', reminderMinutesBefore: 60, notes: '' };
}

export function toPayload(d: AppointmentDraft) {
  return {
    startsAt: d.startsAt.toISOString(),
    location: d.location.trim() || null,
    kind: d.kind,
    reminderMinutesBefore: d.reminderMinutesBefore,
    notes: d.notes.trim() || null,
  };
}

export function useAppointmentDraft(initial?: Appointment) {
  return useState<AppointmentDraft>(() => draftFrom(initial));
}

export function AppointmentForm({ draft, onChange }: { draft: AppointmentDraft; onChange: (d: AppointmentDraft) => void }) {
  const set = <K extends keyof AppointmentDraft>(k: K, v: AppointmentDraft[K]) => onChange({ ...draft, [k]: v });

  const setDatePart = (d: Date) => {
    const next = new Date(draft.startsAt);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    set('startsAt', next);
  };
  const setTimePart = (d: Date) => {
    const next = new Date(draft.startsAt);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    set('startsAt', next);
  };

  return (
    <Stack gap={Spacing.md}>
      <DateTimeField label="Date" mode="date" value={draft.startsAt} onChange={setDatePart} />
      <DateTimeField label="Time" mode="time" value={draft.startsAt} onChange={setTimePart} />
      <Field
        placeholder={draft.kind === 'video' ? 'Add a video link' : 'Add a location'}
        accessibilityLabel="Location"
        value={draft.location}
        onChangeText={(v) => set('location', v)}
        maxLength={200}
      />
      <View style={{ gap: Spacing.sm }}>
        <T variant="bodyStrong">Type</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {(Object.keys(KIND_LABEL) as AppointmentKind[]).map((k) => (
            <Chip key={k} label={KIND_LABEL[k]} selected={draft.kind === k} onPress={() => set('kind', k)} />
          ))}
        </View>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <T variant="bodyStrong">Reminder</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {REMINDERS.map((r) => (
            <Chip
              key={r.label}
              label={r.label}
              selected={draft.reminderMinutesBefore === r.value}
              onPress={() => set('reminderMinutesBefore', r.value)}
            />
          ))}
        </View>
      </View>
      <Field label="Notes (optional)" value={draft.notes} onChangeText={(v) => set('notes', v)} multiline style={{ minHeight: 90 }} />
    </Stack>
  );
}
