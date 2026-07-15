import { ExtensionStorage } from '@bacons/apple-targets';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabaseAnonKey, supabaseUrl } from './supabase';
import { WidgetPayload } from '../types';

const APP_GROUP: string = Constants.expoConfig?.extra?.appGroup ?? '';

// ExtensionStorage is iOS-only native code; guard so Expo Go / Android don't crash.
const storage =
  Platform.OS === 'ios' && APP_GROUP ? new ExtensionStorage(APP_GROUP) : null;

/**
 * Share Supabase credentials with the WidgetKit extension via App Group
 * UserDefaults. Called on sign-in and every foreground token refresh; the
 * widget falls back to the cached payload when the access token expires.
 */
export function writeWidgetCredentials(accessToken: string | null, dailyGoal: number) {
  if (!storage) return;
  storage.set('supabaseUrl', supabaseUrl ?? '');
  storage.set('supabaseAnonKey', supabaseAnonKey ?? '');
  storage.set('accessToken', accessToken ?? undefined);
  storage.set('dailyGoal', dailyGoal);
  ExtensionStorage.reloadWidget();
}

/** Cache today's totals so the widget has data even when its fetch fails. */
export function writeWidgetPayload(payload: WidgetPayload) {
  if (!storage) return;
  storage.set('cachedPayload', JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}

/** Wipe shared data on sign-out / account deletion. */
export function clearWidgetStorage() {
  if (!storage) return;
  storage.remove('accessToken');
  storage.remove('cachedPayload');
  ExtensionStorage.reloadWidget();
}
