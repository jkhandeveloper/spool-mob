import type { Appointment, AppointmentKind } from './types';

export const formatLongDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

export const formatShortDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

export const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** "Thursday · 3:00 PM" within the next week, otherwise "Thu, Nov 12 · 3:00 PM". */
export function formatAppointmentWhen(iso: string): string {
  const d = new Date(iso);
  const days = (d.getTime() - Date.now()) / 86_400_000;
  const day =
    days >= -1 && days < 6
      ? d.toLocaleDateString(undefined, { weekday: 'long' })
      : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${formatTime(d)}`;
}

export const KIND_LABEL: Record<AppointmentKind, string> = {
  in_person: 'In person',
  video: 'Video session',
  phone: 'Phone call',
};

export const appointmentSubtitle = (a: Appointment) => a.location || KIND_LABEL[a.kind];

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** The title is derived from the first line, so don't repeat it in the preview. */
export function journalBodyWithoutTitle(title: string, body: string): string {
  const [first, ...rest] = body.trim().split('\n');
  const remainder = rest.join('\n').trim();
  return first.trim() === title.trim() && remainder ? remainder : body;
}
