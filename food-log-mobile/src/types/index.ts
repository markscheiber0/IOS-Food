// Row shape of public.food_logs in Supabase
export interface FoodLogRow {
  id: string;
  user_id: string;
  food: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugars_g: number | null;
  confidence: number | null;
  source: string;
  logged_at: string; // ISO timestamptz
}

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

export interface DashboardData {
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
