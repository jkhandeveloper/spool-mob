import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** PATCH /me and keep the cached user (and reminders) in sync. */
export function useUpdateMe() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: api.me.update,
    onSuccess: setUser,
  });
}
