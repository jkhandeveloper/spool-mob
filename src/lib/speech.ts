import type { ExpoSpeechRecognitionModule as ModuleType } from 'expo-speech-recognition';

/**
 * expo-speech-recognition is a native module: it is missing in Expo Go and on
 * some web browsers. Load it defensively so the app can offer typed notes instead.
 */
let mod: typeof ModuleType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: typeof ModuleType })
    .ExpoSpeechRecognitionModule;
} catch {
  mod = null;
}

export const speech = mod;

export type SpeechSupport = 'ok' | 'no-module' | 'unavailable' | 'no-on-device';

/**
 * Spool promises that audio never leaves the phone, so we only use
 * on-device recognition. Devices without it get the typed-notes fallback.
 */
export function speechSupport(): SpeechSupport {
  if (!mod) return 'no-module';
  try {
    if (!mod.isRecognitionAvailable()) return 'unavailable';
    if (!mod.supportsOnDeviceRecognition()) return 'no-on-device';
    return 'ok';
  } catch {
    return 'unavailable';
  }
}
