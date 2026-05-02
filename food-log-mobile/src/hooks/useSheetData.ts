import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSheetData } from '../api/sheets';
import { SheetData, WidgetPayload } from '../types';

const CACHE_KEY = '@food_log_cache';
const WIDGET_KEY = '@food_log_widget';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const DAILY_GOAL: number = Constants.expoConfig?.extra?.dailyGoal ?? 2000;

export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const writeWidgetData = useCallback(async (sheetData: SheetData) => {
    const payload: WidgetPayload = {
      calories: Math.round(sheetData.today.totalCalories),
      goal: DAILY_GOAL,
      protein: Math.round(sheetData.today.totalProtein),
      carbs: Math.round(sheetData.today.totalCarbs),
      fat: Math.round(sheetData.today.totalFat),
      updatedAt: new Date().toISOString(),
    };
    // Cache for widget (read by native widget extension via shared container)
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(payload));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const fresh = await fetchSheetData();
      setData(fresh);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      await writeWidgetData(fresh);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);

      // Fall back to cached data
      if (!data) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            setData(JSON.parse(cached));
          } catch {
            // corrupted cache — ignore
          }
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, writeWidgetData]);

  // Load cached data immediately on mount so UI isn't blank
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) {
        try { setData(JSON.parse(cached)); } catch { /* ignore */ }
      }
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    load();
  }, []);

  // Auto-refresh every 5 minutes while app is active
  useEffect(() => {
    intervalRef.current = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return { data, loading, refreshing, error, onRefresh, dailyGoal: DAILY_GOAL };
}
