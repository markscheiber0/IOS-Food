# Food Log Mobile — Architecture & Build Guide

## Overview

React Native / Expo (SDK 52) app for iPhone. Multi-user calorie tracker backed
by **Supabase** (auth + Postgres with RLS + Edge Functions). Meals are logged
in plain language; a `log-food` Edge Function calls the Anthropic API to
estimate macros. Includes a WidgetKit home-screen widget and optional Siri
voice logging via an Apple Shortcut.

The full delivery plan lives in `../docs/IOS_LAUNCH_PLAN.md`; Mark's manual
setup steps are in `../docs/SETUP_SUPABASE.md`.

---

## Architecture

```
food-log-mobile/
├── app/                       Expo Router screens
│   ├── _layout.tsx            AuthProvider + auth gate (redirects to sign-in)
│   ├── (auth)/sign-in.tsx     Sign in with Apple + email OTP
│   ├── index.tsx              Dashboard + "What did you eat?" log input
│   ├── settings.tsx           Daily goal, sign out, delete account (5.1.1(v))
│   └── siri-setup.tsx         Token generation + shortcut install + test
├── src/
│   ├── api/supabase.ts        Supabase client (AsyncStorage session persistence)
│   ├── api/logs.ts            food_logs queries, log-food/delete-account calls,
│   │                          shortcut token generation (sha256 stored, raw shown once)
│   ├── api/widgetStorage.ts   App Group UserDefaults bridge (ExtensionStorage)
│   ├── context/AuthContext.tsx
│   ├── components/            CalorieRing, MacroBreakdown, WeeklyTrend, MealsList
│   ├── constants/colors.ts    Design tokens (#0f172a dark theme, #F97316 accent)
│   ├── hooks/useFoodLogs.ts   Fetch/cache/auto-refresh + submitFood()
│   └── types/                 FoodLogRow, Meal, DashboardData, WidgetPayload
├── targets/food-log-widget/   iOS WidgetKit extension (Swift)
├── assets/icon.png            1024×1024 app icon (placeholder ring motif)
├── app.config.js              Reads .env → SUPABASE_URL / SUPABASE_ANON_KEY etc.
└── .env                       Copy from .env.example — never commit
```

### Data flow

```
app screens → src/api/logs.ts → supabase-js (RLS: user sees only own rows)
logging     → supabase.functions.invoke('log-food') → Claude → insert → summary
widget      → App Group UserDefaults (url/anonKey/accessToken/dailyGoal/cachedPayload,
              written by useFoodLogs via ExtensionStorage) → PostgREST fetch of
              today's food_logs; falls back to cachedPayload on 401/offline;
              shows "Open the app to sign in" when signed out
```

### Notable decisions

- **Sessions persist in AsyncStorage**, not SecureStore — expo-secure-store caps
  values at 2048 bytes, which Supabase session JSON exceeds; this matches
  Supabase's official Expo guidance. The widget only ever receives the
  short-lived access token via the App Group.
- **`@bacons/apple-targets`** (not the nonexistent `expo-apple-targets`)
  generates the widget target at prebuild and provides `ExtensionStorage`.
- **Shortcut tokens**: raw 32-byte token shown once; only its sha256 is stored
  (`shortcut_tokens.token_hash`). The Edge Function does the reverse lookup.

---

## Configuration

1. `cp .env.example .env` and fill in:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (safe to embed; RLS is the boundary)
   - `APPLE_TEAM_ID` (for the widget target signing)
   - `SIRI_SHORTCUT_URL` (after publishing — see `../docs/SIRI_SHORTCUT.md`)
2. Identifiers are fixed in `app.config.js`: bundle ID
   `com.markscheiber.foodlog`, App Group `group.com.markscheiber.foodlog`.

## Development

```bash
npm install
npm start           # JS-only changes; native modules require a dev build
```

Sign in with Apple, the widget, and ExtensionStorage require a dev build /
prebuild — they do not work in Expo Go. Email OTP + dashboard do.

## Building for TestFlight / App Store (on the Mac)

```bash
git pull && npm install
npx expo prebuild --clean          # regenerates ios/ — never hand-edit it
open ios/food-log.xcworkspace
```

In Xcode: set the Team on both the `food-log` and `FoodLogWidget` targets,
verify Sign in with Apple + App Groups capabilities, then Product → Archive →
Distribute App → App Store Connect. Full checklist: `../docs/IOS_LAUNCH_PLAN.md`
§9b. `ios/`/`android/` are gitignored generated output.

## Widget notes

- Refreshes every 15 min (`TimelineProvider.getTimeline`), plus immediately on
  each `ExtensionStorage.reloadWidget()` from the app (sign-in, refresh, log).
- `systemSmall` + `systemMedium`; background `#0f172a`.
- Reads only App Group UserDefaults — no keys are baked into the binary.
