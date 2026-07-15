import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDailyGoal, fetchDashboardData, logFood } from '../api/logs';
import { supabase } from '../api/supabase';
import { writeWidgetCredentials, writeWidgetPayload } from '../api/widgetStorage';
import { DashboardData, WidgetPayload } from '../types';

const CACHE_KEY = '@food_log_cache_v2';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useFoodLogs() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shareWithWidget = useCallback(async (fresh: DashboardData, goal: number) => {
    const payload: WidgetPayload = {
      calories: Math.round(fresh.today.totalCalories),
      goal,
      protein: Math.round(fresh.today.totalProtein),
      carbs: Math.round(fresh.today.totalCarbs),
      fat: Math.round(fresh.today.totalFat),
      updatedAt: new Date().toISOString(),
    };
    // Fresh access token so the widget can fetch on its own between app opens
    const { data: sessionData } = await supabase.auth.getSession();
    writeWidgetCredentials(sessionData.session?.access_token ?? null, goal);
    writeWidgetPayload(payload);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const [fresh, goal] = await Promise.all([fetchDashboardData(), fetchDailyGoal()]);
      setData(fresh);
      setDailyGoal(goal);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, goal }));
      await shareWithWidget(fresh, goal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);

      // Fall back to cached data
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setData(parsed.data);
          setDailyGoal(parsed.goal ?? 2000);
        } catch {
          // corrupted cache — ignore
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shareWithWidget]);

  // Load cached data immediately on mount so UI isn't blank
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setData(parsed.data);
          setDailyGoal(parsed.goal ?? 2000);
        } catch { /* ignore */ }
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

  /** Log a meal via the AI pipeline, then refresh. Returns the spoken summary. */
  const submitFood = useCallback(async (food: string): Promise<string> => {
    const summary = await logFood(food);
    await load(true);
    return summary;
  }, [load]);

  return { data, loading, refreshing, error, onRefresh, dailyGoal, submitFood, reload: load };
}
