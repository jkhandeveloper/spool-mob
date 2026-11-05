/**
 * Holds a finished transcript on the device until the upload succeeds, so an
 * interrupted upload (P5) can be retried without losing the session. It lives
 * in memory only: nothing is written to disk.
 */
interface PendingUpload {
  transcript: string;
  durationSeconds: number;
}

const pending = new Map<string, PendingUpload>();
const prompts = new Map<string, string[]>();

export const sessionStore = {
  setPrompts: (id: string, p: string[]) => prompts.set(id, p),
  getPrompts: (id: string) => prompts.get(id) ?? [],
  stash: (id: string, upload: PendingUpload) => pending.set(id, upload),
  get: (id: string) => pending.get(id),
  clear: (id: string) => {
    pending.delete(id);
    prompts.delete(id);
  },
};
