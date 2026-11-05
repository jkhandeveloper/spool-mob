import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async handler with pending/error state so every form shows the
 * same accessible error and doesn't double-submit.
 */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async (...args: A) => {
      if (busy.current) return;
      busy.current = true;
      setPending(true);
      setError(null);
      try {
        await fn(...args);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [fn],
  );

  return { run, pending, error, setError };
}
