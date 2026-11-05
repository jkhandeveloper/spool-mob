import { useKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';

/** Keeps the screen on during sessions and meditations (native only; web wake locks are unreliable). */
export const useScreenAwake: () => void = Platform.OS === 'web' ? () => undefined : () => useKeepAwake();
