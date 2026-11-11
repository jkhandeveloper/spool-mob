import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { ensureOfflineLocale, speech, speechSupport } from '@/lib/speech';

export type RecorderState =
  | 'starting'
  | 'denied' // microphone / speech permission refused
  | 'unsupported' // no on-device recognition: use typed notes
  | 'listening'
  | 'paused'
  | 'interrupted' // phone call, Siri, audio route change…
  | 'stopping'
  | 'stopped';

const LEVELS = 48;

/**
 * Live, on-device transcription for 03 Live session (and the P5 recording states).
 * Audio is not recorded or kept; only the recognized text is accumulated.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>('starting');
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState('');
  const [levels, setLevels] = useState<number[]>(() => Array(LEVELS).fill(0));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const finals = useRef<string[]>([]);
  const stateRef = useRef<RecorderState>('starting');
  const endWaiters = useRef<(() => void)[]>([]);

  const set = (s: RecorderState) => {
    stateRef.current = s;
    setState(s);
  };

  const begin = useCallback(() => {
    if (!speech) return;
    speech.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      // Keep the microphone stream entirely in memory; never write an audio file.
      recordingOptions: { persist: false },
    });
  }, []);

  // Event subscriptions.
  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener('start', () => {
        if (stateRef.current === 'starting' || stateRef.current === 'paused' || stateRef.current === 'interrupted') {
          set('listening');
        }
      }),
      speech.addListener('result', (e) => {
        const text = e.results[0]?.transcript?.trim() ?? '';
        if (e.isFinal) {
          if (text) finals.current.push(text);
          setInterim('');
        } else {
          setInterim(text);
        }
      }),
      speech.addListener('volumechange', (e) => {
        // value is roughly -2 (silence) … 10 (loud)
        const v = Math.max(0, Math.min(1, (e.value + 2) / 12));
        setLevels((prev) => [...prev.slice(1), v]);
      }),
      speech.addListener('error', (e) => {
        switch (e.error) {
          case 'no-speech':
          case 'speech-timeout':
            return; // silence is fine; "end" will restart
          case 'not-allowed':
            set('denied');
            return;
          case 'language-not-supported':
          case 'service-not-allowed':
            setErrorMessage(
              'The English offline speech model is not installed or available on this device. You can write session notes instead.',
            );
            set('unsupported');
            return;
          case 'interrupted':
          case 'audio-capture':
            set('interrupted');
            return;
          case 'aborted':
            return;
          default:
            setErrorMessage(e.message || 'Listening stopped unexpectedly.');
            if (stateRef.current === 'listening') set('interrupted');
        }
      }),
      speech.addListener('end', () => {
        endWaiters.current.splice(0).forEach((resolve) => resolve());
        // Recognizers stop on long silences (especially Android): keep listening.
        if (stateRef.current === 'listening') begin();
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [begin]);

  // Permission + start.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (speechSupport() !== 'ok' || !speech) {
        set('unsupported');
        return;
      }
      const perm = await speech.requestPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        set('denied');
        return;
      }
      const locale = await ensureOfflineLocale('en-US');
      if (!locale.ready) {
        setErrorMessage(locale.message ?? 'On-device speech recognition is not ready.');
        set('unsupported');
        return;
      }
      begin();
    })().catch(() => set('unsupported'));
    return () => {
      cancelled = true;
      speech?.abort();
    };
  }, [begin]);

  // Timer only runs while listening.
  useEffect(() => {
    if (state !== 'listening') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const pause = useCallback(() => {
    set('paused');
    speech?.stop();
  }, []);

  const resume = useCallback(() => {
    setErrorMessage(null);
    set('paused'); // the "start" event moves us to listening
    begin();
  }, [begin]);

  /** Stops listening and resolves with the full transcript once the final result is in. */
  const finish = useCallback(async (): Promise<string> => {
    const wasActive = stateRef.current === 'listening';
    set('stopping');
    if (speech && wasActive) {
      await Promise.race([
        new Promise<void>((resolve) => {
          endWaiters.current.push(resolve);
          speech!.stop();
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    }
    set('stopped');
    return [...finals.current, interim].filter(Boolean).join(' ').trim();
  }, [interim]);

  const discard = useCallback(() => {
    set('stopped');
    speech?.abort();
    finals.current = [];
    setInterim('');
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS !== 'web') Linking.openSettings();
  }, []);

  return { state, elapsed, interim, levels, errorMessage, pause, resume, finish, discard, openSettings };
}
