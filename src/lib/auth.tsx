import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshTokens, setSignedOutHandler, setTokens } from './api';
import { cancelAllReminders, syncDailyReminder } from './notifications';
import type { User } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: User | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName?: string): Promise<void>;
  signOut(): Promise<void>;
  /** Replace the cached user after a profile/settings change. */
  setUser(user: User): void;
  /** Forget the local session without calling the API (e.g. after account deletion). */
  clearSession(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const clearSession = useCallback(async () => {
    await setTokens(null);
    await cancelAllReminders().catch(() => undefined);
    queryClient.clear();
    setUserState(null);
    setStatus('signedOut');
  }, [queryClient]);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    syncDailyReminder(next).catch(() => undefined);
  }, []);

  const loadUser = useCallback(async () => {
    const me = await api.me.get();
    setUser(me);
    setStatus('signedIn');
  }, [setUser]);

  // Restore a previous session from the stored refresh token.
  useEffect(() => {
    setSignedOutHandler(() => void clearSession());
    (async () => {
      try {
        if (await refreshTokens()) await loadUser();
        else setStatus('signedOut');
      } catch {
        // Offline at launch: stay signed out rather than hanging on the splash screen.
        setStatus('signedOut');
      }
    })();
    return () => setSignedOutHandler(null);
  }, [clearSession, loadUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      setUser,
      clearSession,
      async signIn(email, password) {
        await setTokens(await api.auth.login({ email: email.trim(), password }));
        await loadUser();
      },
      async signUp(email, password, displayName) {
        await setTokens(
          await api.auth.register({ email: email.trim(), password, displayName: displayName?.trim() || undefined }),
        );
        await loadUser();
      },
      async signOut() {
        await api.auth.logout().catch(() => undefined);
        await clearSession();
      },
    }),
    [status, user, setUser, clearSession, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
