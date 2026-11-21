import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type SpeechModule = typeof ExpoSpeechRecognitionModule;
type Preparation = { state: 'ready' | 'denied' | 'unsupported' | 'cancelled'; message?: string };

/** iOS offline recognition needs microphone permission, not Apple's online service. */
export async function prepareIOSRecording(
  speech: SpeechModule | null,
  isDevice: boolean,
  cancelled: () => boolean,
): Promise<Preparation> {
  if (!speech) return { state: 'unsupported', message: 'Voice transcription is missing from this build. Install the latest native iPhone build of Spool.' };
  const permission = await speech.requestMicrophonePermissionsAsync();
  if (cancelled()) return { state: 'cancelled' };
  if (!permission.granted) return { state: 'denied', message: 'Allow microphone access for Spool in iPhone Settings, then return to this session.' };

  // isRecognitionAvailable() describes service availability and may be false
  // before authorization or without a network. It must not block offline speech.
  if (speech.supportsOnDeviceRecognition()) return { state: 'ready' };
  return {
    state: 'unsupported',
    message: isDevice
      ? 'This iPhone does not currently provide offline speech recognition. You can use session notes while offline recognition is unavailable.'
      : 'This iOS simulator does not have an offline speech model. Appetize also does not support microphone input. Test live voice on a physical iPhone.',
  };
}
