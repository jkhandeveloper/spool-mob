import type { ExpoSpeechRecognitionModule as ModuleType } from 'expo-speech-recognition';
import { Platform } from 'react-native';

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

/**
 * Android can support on-device recognition while still missing the locale's
 * offline model. Ask Android to install it before calling start(), otherwise
 * the recognizer emits the rather opaque "language not downloaded" error.
 */
export async function ensureOfflineLocale(locale: string): Promise<{
  ready: boolean;
  message?: string;
}> {
  if (!mod || Platform.OS !== 'android') return { ready: speechSupport() === 'ok' };

  try {
    const supported = await mod.getSupportedLocales({});
    if (supported.installedLocales.includes(locale)) return { ready: true };

    if (!supported.locales.includes(locale)) {
      return {
        ready: false,
        message: `On-device speech recognition does not support ${locale} on this device.`,
      };
    }

    const result = await mod.androidTriggerOfflineModelDownload({ locale });
    if (result.status === 'download_success') return { ready: true };

    return {
      ready: false,
      message:
        result.status === 'opened_dialog'
          ? 'Android opened the download prompt for the English speech model. Confirm it, then start another session.'
          : 'The English speech model is downloading. Start another session after the download finishes.',
    };
  } catch {
    return {
      ready: false,
      message: 'The English speech model is not ready on this device. You can write session notes instead.',
    };
  }
}
