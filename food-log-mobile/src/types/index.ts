export interface Meal {
  timestamp: string;
  food: string;
  source: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number;
  confidence: number;
  aiModel: string;
  notes: string;
}

export interface TodayData {
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface WeeklyData {
  [dateStr: string]: number;
}

export interface SheetData {
  today: TodayData;
  weekly: WeeklyData;
}

export interface WidgetPayload {
  calories: number;
  goal: number;
  protein: number;
  carbs: number;
  fat: number;
  updatedAt: string;
}
