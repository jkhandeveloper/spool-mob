// Shapes returned by the Spool API (dates arrive as ISO strings).

export type TextSize = 'default' | 'large' | 'extra-large';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  journalOnly: boolean;
  privacyReviewedAt: string | null;
  graduatedAt: string | null;
  remindersEnabled: boolean;
  reminderTime: string | null;
  textSize: TextSize;
  reduceMotion: boolean;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  includeInPrompts: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'recording' | 'processing' | 'draft' | 'saved' | 'failed';

export interface TherapySession {
  id: string;
  status: SessionStatus;
  prompts: string[];
  durationSeconds: number | null;
  title: string | null;
  topics: string[];
  mainPoints: string[];
  takeaways: string[];
  dailyGoal: string | null;
  weeklyGoal: string | null;
  failureReason: string | null;
  canRetry: boolean;
  savedAt: string | null;
  createdAt: string;
}

export interface PromptCandidate {
  entryId: string;
  prompt: string;
  excerpt: string;
  createdAt: string;
}

export type GoalCadence = 'daily' | 'weekly';

export interface GoalCheckIn {
  id: string;
  completed: boolean;
  reflection: string | null;
  createdAt: string;
}

export interface Goal {
  id: string;
  cadence: GoalCadence;
  text: string;
  active: boolean;
  completedAt: string | null;
  sessionId: string | null;
  doneThisPeriod?: boolean;
  checkIns?: GoalCheckIn[];
  createdAt: string;
}

export type AppointmentKind = 'in_person' | 'video' | 'phone';

export interface Appointment {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  kind: AppointmentKind;
  location: string | null;
  notes: string | null;
  reminderMinutesBefore: number | null;
  cancelledAt: string | null;
}

export interface MeditationStep {
  at: number;
  text: string;
}

export interface Meditation {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  steps: MeditationStep[];
}

export interface Today {
  user: User;
  reminder: string;
  meditation: { id: string; label: string; title: string; durationSeconds: number };
  nextAppointment: Appointment | null;
  goals: Goal[];
  journalThisWeek: number;
  pendingSession: TherapySession | null;
}
