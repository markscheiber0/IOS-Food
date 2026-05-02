import Constants from 'expo-constants';
import { Meal, SheetData, TodayData, WeeklyData } from '../types';

const { googleSheetsApiKey, googleSheetsId, dailyGoal } = Constants.expoConfig?.extra ?? {};

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateStr(raw: string): string {
  // Handle YYYY-MM-DD HH:MM:SS or MM/DD/YYYY HH:MM:SS
  const datePart = raw.trim().split(' ')[0];
  if (datePart.includes('/')) {
    const [month, day, year] = datePart.split('/');
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return datePart;
}

function findIndex(headers: string[], name: string): number {
  return headers.findIndex(
    h => h && h.toLowerCase().trim() === name.toLowerCase().trim(),
  );
}

function processRows(rows: string[][]): SheetData {
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

  if (!rows || rows.length < 2) return { today: todayData, weekly };

  const headers = rows[0];
  const col = {
    timestamp: findIndex(headers, 'TimeStamp'),
    food: findIndex(headers, 'Food'),
    source: findIndex(headers, 'Source'),
    calories: findIndex(headers, 'Calories'),
    // Preserving the typo in the sheet header intentionally
    protein: findIndex(headers, 'Protien (g)'),
    carbs: findIndex(headers, 'Carbs (g)'),
    fat: findIndex(headers, 'Fat (g)'),
    fiber: findIndex(headers, 'Fiber (g)'),
    sugars: findIndex(headers, 'Sugars(g)'),
    confidence: findIndex(headers, 'Confidence(0-100)'),
    aiModel: findIndex(headers, 'AI Model Used'),
    notes: findIndex(headers, 'Notes'),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[col.timestamp] || !row[col.calories]) continue;

    const dateStr = normalizeDateStr(row[col.timestamp]);
    const calories = parseFloat(row[col.calories]) || 0;
    const protein = parseFloat(row[col.protein]) || 0;
    const carbs = parseFloat(row[col.carbs]) || 0;
    const fat = parseFloat(row[col.fat]) || 0;
    const sugars = parseFloat(row[col.sugars]) || 0;

    if (Object.prototype.hasOwnProperty.call(weekly, dateStr)) {
      weekly[dateStr] += calories;
    }

    if (dateStr === today) {
      const meal: Meal = {
        timestamp: row[col.timestamp].trim(),
        food: row[col.food] || 'Unknown',
        source: row[col.source] || '',
        calories,
        protein,
        carbs,
        fat,
        sugars,
        confidence: parseInt(row[col.confidence]) || 0,
        aiModel: row[col.aiModel] || '',
        notes: row[col.notes] || '',
      };
      todayData.meals.push(meal);
      todayData.totalCalories += calories;
      todayData.totalProtein += protein;
      todayData.totalCarbs += carbs;
      todayData.totalFat += fat;
    }
  }

  return { today: todayData, weekly };
}

export async function fetchSheetData(): Promise<SheetData> {
  if (!googleSheetsApiKey || !googleSheetsId) {
    throw new Error('Missing API key or Sheet ID — check your .env file.');
  }

  const range = encodeURIComponent('Sheet1!A:L');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsId}/values/${range}?key=${googleSheetsApiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sheets API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return processRows(json.values as string[][]);
}

export { dailyGoal };
