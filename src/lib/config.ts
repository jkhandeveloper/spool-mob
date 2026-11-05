import Constants from 'expo-constants';

/**
 * Base URL of the Spool API.
 * - Set EXPO_PUBLIC_API_URL to override (e.g. https://api.example.com/api/v1).
 * - In development we default to the machine running Metro, port 3000, so a
 *   physical device on the same Wi-Fi reaches a locally running API.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000/api/v1`;
}

export const API_URL = resolveApiUrl();
