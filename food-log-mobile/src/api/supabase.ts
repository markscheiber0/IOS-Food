import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState } from 'react-native';

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra ?? {};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing SUPABASE_URL / SUPABASE_ANON_KEY — check your .env file.');
}

// Session storage note: Supabase's Expo guide uses AsyncStorage. expo-secure-store
// caps values at 2048 bytes, which Supabase session JSON exceeds — the session
// lives in the app sandbox, and the widget only ever receives the short-lived
// access token via the App Group.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is foregrounded (Supabase RN pattern)
AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export { supabaseUrl, supabaseAnonKey };
