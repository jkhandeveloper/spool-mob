import { isDevice } from 'expo-device';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { speech } from '@/lib/speech';
import { prepareIOSRecording } from '@/lib/ios-speech';

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
  const interimRef = useRef('');
  const mounted = useRef(true);
  const stateRef = useRef<RecorderState>('starting');
  const endWaiters = useRef<(() => void)[]>([]);

  const set = (s: RecorderState) => {
    stateRef.current = s;
    if (mounted.current) setState(s);
  };

  const begin = useCallback(() => {
    if (!speech || !mounted.current || stateRef.current === 'stopped' || stateRef.current === 'stopping') return;
    try { speech.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: true,
      iosTaskHint: 'dictation',
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'measurement' },
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      // Keep the microphone stream entirely in memory; never write an audio file.
      recordingOptions: { persist: false },
    }); } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The microphone could not start. Please try again.');
      set('interrupted');
    }
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
          interimRef.current = '';
          setInterim('');
        } else {
          interimRef.current = text;
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
            if (stateRef.current === 'listening' || stateRef.current === 'starting') set('interrupted');
        }
      }),
      speech.addListener('end', () => {
        endWaiters.current.splice(0).forEach((resolve) => resolve());
        // Recognizers stop on long silences (especially Android): keep listening.
        if (mounted.current && stateRef.current === 'listening') begin();
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [begin]);

  // Permission + start.
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    const initialize = async () => {
      set('starting');
      try {
        const result = await prepareIOSRecording(speech, isDevice, () => cancelled || stateRef.current === 'stopped' || stateRef.current === 'stopping');
        if (cancelled || result.state === 'cancelled') return;
        setErrorMessage(result.message ?? null);
        if (result.state === 'ready') begin();
        else set(result.state);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Microphone setup failed. Please try again.');
        set('interrupted');
      }
    };
    void initialize();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' && (stateRef.current === 'denied' || stateRef.current === 'unsupported')) void initialize();
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      stateRef.current = 'stopped';
      appState.remove();
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
    return [...finals.current, interimRef.current].filter(Boolean).join(' ').trim();
  }, []);

  const discard = useCallback(() => {
    set('stopped');
    speech?.abort();
    finals.current = [];
    interimRef.current = '';
    setInterim('');
  }, []);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { state, elapsed, interim, levels, errorMessage, pause, resume, finish, discard, openSettings };
}
