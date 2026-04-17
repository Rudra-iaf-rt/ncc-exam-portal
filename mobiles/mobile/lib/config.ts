import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base including `/api`. Override in app.json `expo.extra.apiUrl`.
 * Android emulator: use machine IP or 10.0.2.2 for localhost backend.
 */
export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl) {
    return extra.apiUrl.replace(/\/$/, '');
  }
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3000/api'
      : 'http://localhost:3000/api';
  }
  return 'https://your-api.example.com/api';
}
