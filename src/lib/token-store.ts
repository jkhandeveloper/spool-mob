import { isDevice } from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'spool.refreshToken';
let memoryOnly = false;
let memoryToken: string | null = null;

function enableSimulatorMemory(error: unknown): boolean {
  // Unsigned Appetize/simulator builds can lack Keychain entitlements. Never
  // downgrade storage on a physical device or for unrelated Keychain errors.
  const message = error instanceof Error ? error.message : String(error);
  if (Platform.OS !== 'ios' || isDevice || !/entitlement|-34018/i.test(message)) return false;
  memoryOnly = true;
  return true;
}

function storageError(error: unknown): Error {
  return new Error('Spool could not access secure sign-in storage. Please restart the app and try again.', { cause: error });
}

// Refresh tokens live in the Keychain / Keystore. On web (dev only) we fall
// back to localStorage since SecureStore is unavailable there. An iOS simulator
// without Keychain entitlements uses memory only, until the app is restarted.
export const tokenStore = {
  async get(): Promise<string | null> {
    if (memoryOnly) return memoryToken;
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    try {
      return await SecureStore.getItemAsync(KEY);
    } catch (error) {
      if (enableSimulatorMemory(error)) return memoryToken;
      throw storageError(error);
    }
  },
  async set(token: string): Promise<void> {
    if (memoryOnly) { memoryToken = token; return; }
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(KEY, token);
    try {
      await SecureStore.setItemAsync(KEY, token);
    } catch (error) {
      if (!enableSimulatorMemory(error)) throw storageError(error);
      memoryToken = token;
    }
  },
  async clear(): Promise<void> {
    memoryToken = null;
    if (memoryOnly) return;
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(KEY);
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch (error) {
      if (!enableSimulatorMemory(error)) throw storageError(error);
    }
  },
};
