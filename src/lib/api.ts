import { API_URL } from './config';
import { tokenStore } from './token-store';
import type {
  Appointment,
  Goal,
  GoalCheckIn,
  JournalEntry,
  Meditation,
  PromptCandidate,
  TherapySession,
  Today,
  TokenPair,
  User,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: (() => void) | null = null;

/** Called by the auth provider so an expired session returns the user to Welcome. */
export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

export async function setTokens(tokens: TokenPair | null) {
  accessToken = tokens?.accessToken ?? null;
  if (tokens) await tokenStore.set(tokens.refreshToken);
  else await tokenStore.clear();
}

/** Exchanges the stored refresh token for new tokens. Concurrent callers share one request. */
export function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await tokenStore.get();
      if (!refreshToken) return false;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.status === 401) {
        await setTokens(null);
        return false;
      }
      if (!res.ok) throw new ApiError('Could not refresh session', res.status);
      await setTokens((await res.json()) as TokenPair);
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join('\n');
    if (typeof m === 'string') return m;
  }
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'Something went wrong. Please try again.';
}

async function request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("You're offline or Spool can't be reached. Check your connection and try again.", 0);
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshTokens().catch(() => false)) return request<T>(method, path, body, true);
    onSignedOut?.();
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status);
  return data as T;
}

const get = <T>(p: string) => request<T>('GET', p);
const post = <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const patch = <T>(p: string, b: unknown) => request<T>('PATCH', p, b);
const del = <T = void>(p: string) => request<T>('DELETE', p);

export const api = {
  auth: {
    register: (b: { email: string; password: string; displayName?: string }) =>
      post<TokenPair>('/auth/register', b),
    login: (b: { email: string; password: string }) => post<TokenPair>('/auth/login', b),
    logout: () => post<void>('/auth/logout'),
    forgotPassword: (email: string) =>
      post<{ message: string; devResetToken?: string }>('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) =>
      post<void>('/auth/reset-password', { token, password }),
  },
  me: {
    get: () => get<User>('/me'),
    update: (b: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>) => patch<User>('/me', b),
    privacyReview: (journalOnly: boolean) => post<User>('/me/privacy-review', { journalOnly }),
    graduate: () => post<User>('/me/graduate'),
    resume: () => del<User>('/me/graduate'),
    export: () => get<Record<string, unknown>>('/me/export'),
    deleteData: () => del('/me/data'),
    deleteAccount: (password: string) => post<void>('/me/delete-account', { password }),
  },
  today: () => get<Today>(`/today?hour=${new Date().getHours()}`),
  journal: {
    list: () => get<{ items: JournalEntry[]; total: number }>('/journal?limit=100'),
    get: (id: string) => get<JournalEntry>(`/journal/${id}`),
    create: (b: { title?: string; body: string; includeInPrompts?: boolean }) =>
      post<JournalEntry>('/journal', b),
    update: (id: string, b: Partial<Pick<JournalEntry, 'title' | 'body' | 'includeInPrompts'>>) =>
      patch<JournalEntry>(`/journal/${id}`, b),
    remove: (id: string) => del(`/journal/${id}`),
  },
  sessions: {
    list: () => get<TherapySession[]>('/sessions'),
    pending: () => get<TherapySession[]>('/sessions/pending'),
    prompts: () => get<PromptCandidate[]>('/sessions/prompts'),
    create: (prompts: string[]) => post<TherapySession>('/sessions', { consentConfirmed: true, prompts }),
    get: (id: string) => get<TherapySession>(`/sessions/${id}`),
    submitTranscript: (id: string, transcript: string, durationSeconds: number) =>
      post<TherapySession>(`/sessions/${id}/transcript`, { transcript, durationSeconds }),
    retry: (id: string) => post<TherapySession>(`/sessions/${id}/retry`),
    update: (
      id: string,
      b: Partial<Pick<TherapySession, 'title' | 'topics' | 'mainPoints' | 'takeaways' | 'dailyGoal' | 'weeklyGoal'>>,
    ) => patch<TherapySession>(`/sessions/${id}`, b),
    save: (id: string, keep: boolean) => post<{ session: TherapySession | null }>(`/sessions/${id}/save`, { keep }),
    remove: (id: string) => del(`/sessions/${id}`),
  },
  goals: {
    list: () => get<Goal[]>('/goals'),
    get: (id: string) => get<Goal>(`/goals/${id}`),
    update: (id: string, b: { text?: string; completed?: boolean }) => patch<Goal>(`/goals/${id}`, b),
    checkIn: (id: string, b: { completed: boolean; reflection?: string }) =>
      post<GoalCheckIn>(`/goals/${id}/check-ins`, b),
  },
  appointments: {
    list: (from: Date, to: Date) =>
      get<Appointment[]>(`/appointments?from=${from.toISOString()}&to=${to.toISOString()}`),
    next: () => get<{ appointment: Appointment | null }>('/appointments/next'),
    get: (id: string) => get<Appointment>(`/appointments/${id}`),
    create: (b: Partial<Appointment> & { startsAt: string }) => post<Appointment>('/appointments', b),
    update: (id: string, b: Partial<Appointment>) => patch<Appointment>(`/appointments/${id}`, b),
    cancel: (id: string) => del(`/appointments/${id}`),
  },
  meditations: {
    list: () => get<Meditation[]>('/meditations'),
    get: (id: string) => get<Meditation>(`/meditations/${id}`),
  },
};
