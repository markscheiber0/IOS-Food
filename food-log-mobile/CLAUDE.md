# Food Log Mobile — Architecture & Build Guide

## Overview

React Native / Expo app for iPhone that mirrors the web calorie tracker. Data source is unchanged: Google Sheets via the Sheets REST API. The app adds a home screen widget, auto-refresh, and pull-to-refresh.

---

## Architecture

```
food-log-mobile/
├── app/                   Expo Router screens
│   ├── _layout.tsx        Root layout (StatusBar, Stack navigator)
│   └── index.tsx          Main (only) screen
├── src/
│   ├── api/sheets.ts      Google Sheets fetch + row parsing
│   ├── components/        Four visual sections
│   │   ├── CalorieRing    Doughnut chart (consumed / remaining)
│   │   ├── MacroBreakdown Doughnut chart (protein / carbs / fat)
│   │   ├── WeeklyTrend    Line chart (7-day calorie history)
│   │   └── MealsList      Sorted list of today's meals
│   ├── constants/colors   Shared design tokens
│   ├── hooks/useSheetData Data fetching, caching, auto-refresh
│   └── types/             Shared TypeScript types
├── targets/
│   └── food-log-widget/   iOS WidgetKit extension (Swift)
├── app.config.js          Dynamic Expo config (reads .env)
└── .env                   API keys — never commit this file
```

### Data flow

```
Google Sheets API
      │
      ▼
src/api/sheets.ts        ← fetches + parses rows
      │
      ▼
src/hooks/useSheetData   ← manages state, auto-refresh (5 min), pull-to-refresh
      │               └── caches to AsyncStorage (@food_log_cache)
      ▼
app/index.tsx            ← ScrollView with RefreshControl, four sections

Widget (independent):
  targets/food-log-widget/FoodLogWidget.swift
      └── fetches Sheets API directly via URLSession every 15 min
          (API key read from widget's Info.plist at build time)
```

### Column mapping (mirrors web app exactly)

| Sheet header         | Field     | Note                         |
|----------------------|-----------|------------------------------|
| TimeStamp            | timestamp | YYYY-MM-DD HH:MM or MM/DD/YYYY |
| Food                 | food      |                              |
| Calories             | calories  |                              |
| Protien (g)          | protein   | Intentional typo in sheet    |
| Carbs (g)            | carbs     |                              |
| Fat (g)              | fat       |                              |
| Sugars(g)            | sugars    | No space before `(`          |
| Confidence(0-100)    | confidence|                              |

---

## Configuration

### 1. Create your .env file

```bash
cp .env.example .env
```

Edit `.env`:
```
GOOGLE_SHEETS_API_KEY=AIzaSy...yourkey...
GOOGLE_SHEETS_ID=15IaBLt3...yoursheetid...
DAILY_GOAL=2000
```

The `app.config.js` reads this file at build time and injects values into:
- `Constants.expoConfig.extra.*` — used by the React Native app
- `Info.plist` of the widget extension — used by Swift code

### 2. Update identifiers (required before first build)

In `app.config.js`, change:
- `BUNDLE_ID` → `com.yourname.foodlog` (must be unique to your Apple ID)
- `APP_GROUP` → `group.com.yourname.foodlog`

In `targets/food-log-widget/expo-target.config.js`, there is no bundle ID to set — Expo derives it as `<BUNDLE_ID>.widget` automatically.

---

## First-time setup

```bash
cd food-log-mobile
npm install
```

---

## Building for iPhone (sideload via AltStore)

### Prerequisites (Mac only)

- Xcode 15+ installed
- AltStore installed on iPhone and Mac
- Free Apple ID signed into Xcode (Preferences → Accounts)
- iPhone connected via USB (trust the computer)

### Step 1 — Generate native iOS project

```bash
npm run prebuild
```

This runs `expo prebuild --clean` which creates the `ios/` directory.
**Do not run this again without `--clean` unless you know what you're doing** — it regenerates native files.

### Step 2 — Inject API keys into widget Info.plist

After prebuild, open `ios/FoodLogWidget/Info.plist` and verify (or manually set) the keys:

```xml
<key>SHEETS_API_KEY</key>
<string>YOUR_API_KEY</string>
<key>SHEETS_ID</key>
<string>YOUR_SHEET_ID</string>
<key>DAILY_GOAL</key>
<string>2000</string>
```

If the xcconfig variables (`$(SHEETS_API_KEY)`) resolved correctly from `.env` you won't need to do this manually. If they show literal `$(...)` strings, replace them.

### Step 3 — Open in Xcode

```bash
open ios/food-log.xcworkspace
```

**Important**: open the `.xcworkspace`, not `.xcodeproj`.

### Step 4 — Configure signing

1. Select the `food-log` target in the project navigator
2. Signing & Capabilities → Team: select your personal Apple ID
3. Bundle Identifier: `com.yourname.foodlog` (must match `app.config.js`)
4. Select the `FoodLogWidget` target → same team, bundle ID auto-set to `com.yourname.foodlog.widget`

### Step 5 — App Groups (for future widget data sharing)

> Currently the widget fetches data independently from Sheets API.
> If you want the app to push data to the widget without a network call:
> 1. Both targets need the App Groups capability with `group.com.yourname.foodlog`
> 2. App Groups require a **paid** Apple Developer account for full provisioning
> 3. With a free Apple ID, Xcode may still let you sign locally — try it and see

### Step 6 — Build and sideload

**Option A — AltStore direct install**
1. In Xcode: Product → Archive
2. Once the archive finishes, Organizer opens
3. Distribute App → Ad Hoc or Development
4. Export the `.ipa` file
5. Open AltStore on Mac → My Apps → Install App → select the `.ipa`

**Option B — Direct device run**
1. Select your iPhone as the run destination in Xcode
2. Product → Run (⌘R)
3. The app installs directly (valid for 7 days with a free account)

### Re-signing every 7 days (free Apple ID limitation)

With a free Apple ID, sideloaded apps expire after 7 days. AltStore can re-sign automatically if:
- AltStore Server is running on your Mac
- iPhone and Mac are on the same Wi-Fi

AltStore refreshes apps in the background before they expire.

---

## Widget notes

- The widget fetches data independently using its own URLSession call
- Refresh interval: every 15 minutes (set in `TimelineProvider.getTimeline`)
- Supports `systemSmall` and `systemMedium` families
- Dark background matches the app: `#0f172a`
- The widget reads `SHEETS_API_KEY`, `SHEETS_ID`, and `DAILY_GOAL` from its own `Info.plist`

---

## Development workflow

```bash
# Start Expo dev server (for JS-only changes without rebuilding native)
npm start

# Rebuild native (after changing app.config.js, adding packages, etc.)
npm run prebuild
```

For changes to only JS/TS files (components, hooks, API), you don't need to rebuild native — use `expo-dev-client` or just re-run in Xcode.

For widget Swift changes, always rebuild in Xcode.

---

## Package notes

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based routing |
| `expo-constants` | Access `app.config.js` extra values at runtime |
| `expo-background-fetch` + `expo-task-manager` | Background data refresh (registers OS task) |
| `react-native-gifted-charts` | PieChart (doughnut) + LineChart |
| `react-native-svg` | Required by gifted-charts |
| `expo-linear-gradient` | Required by gifted-charts area fill |
| `expo-apple-targets` | Adds WidgetKit extension target to Xcode project |
| `@react-native-async-storage/async-storage` | Caches last-fetched data for offline use |
| `react-native-reanimated` | Required by gifted-charts animations |
