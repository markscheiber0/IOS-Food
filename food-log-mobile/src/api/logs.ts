import * as Crypto from 'expo-crypto';
import { supabase, supabaseUrl } from './supabase';
import { DashboardData, FoodLogRow, Meal, TodayData, WeeklyData } from '../types';

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Start of the local day 6 days ago, as ISO — covers the 7-day trend window. */
function weekWindowStartISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function rowToMeal(row: FoodLogRow): Meal {
  const logged = new Date(row.logged_at);
  const hh = String(logged.getHours()).padStart(2, '0');
  const mm = String(logged.getMinutes()).padStart(2, '0');
  return {
    timestamp: `${getDateString(logged)} ${hh}:${mm}`,
    food: row.food,
    source: row.source,
    calories: row.calories ?? 0,
    protein: Number(row.protein_g ?? 0),
    carbs: Number(row.carbs_g ?? 0),
    fat: Number(row.fat_g ?? 0),
    sugars: Number(row.sugars_g ?? 0),
    confidence: row.confidence ?? 0,
    aiModel: '',
    notes: '',
  };
}

function processRows(rows: FoodLogRow[]): DashboardData {
  const today = getDateString(new Date());

  const weekly: WeeklyData = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weekly[getDateString(d)] = 0;
  }

  const todayData: TodayData = {
    meals: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  };

  for (const row of rows) {
    const dateStr = getDateString(new Date(row.logged_at));
    const calories = row.calories ?? 0;

    if (Object.prototype.hasOwnProperty.call(weekly, dateStr)) {
      weekly[dateStr] += calories;
    }

    if (dateStr === today) {
      const meal = rowToMeal(row);
      todayData.meals.push(meal);
      todayData.totalCalories += meal.calories;
      todayData.totalProtein += meal.protein;
      todayData.totalCarbs += meal.carbs;
      todayData.totalFat += meal.fat;
    }
  }

  return { today: todayData, weekly };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .gte('logged_at', weekWindowStartISO())
    .order('logged_at', { ascending: false });

  if (error) throw new Error(error.message);
  return processRows((data ?? []) as FoodLogRow[]);
}

export async function fetchDailyGoal(): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('daily_goal')
    .maybeSingle();
  return data?.daily_goal ?? 2000;
}

export async function updateDailyGoal(goal: number): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userData.user.id, daily_goal: goal });
  if (error) throw new Error(error.message);
}

/** Call the log-food Edge Function with the user's JWT. Returns the spoken summary. */
export async function logFood(food: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('log-food', {
    body: { food },
  });
  if (error) throw new Error('Could not log that — check your connection and try again.');
  return (data as { summary?: string })?.summary ?? 'Logged.';
}

/**
 * Generate a Siri shortcut token: random 32 bytes shown to the user ONCE;
 * only the sha256 hex is stored server-side.
 */
export async function createShortcutToken(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not signed in');

  const bytes = await Crypto.getRandomBytesAsync(32);
  const rawToken = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawToken,
  );

  const { error } = await supabase.from('shortcut_tokens').insert({
    user_id: userData.user.id,
    token_hash: hash,
  });
  if (error) throw new Error(error.message);

  return rawToken;
}

/** Newest Siri-sourced log — used by the "Test it" row on the Siri setup screen. */
export async function fetchLatestSiriLog(): Promise<FoodLogRow | null> {
  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('source', 'siri')
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as FoodLogRow) ?? null;
}

/** Call the delete-account Edge Function (App Review requires in-app deletion). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error('Account deletion failed — try again.');
}

export { supabaseUrl };
