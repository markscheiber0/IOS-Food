# App Store Connect — listing draft (Phase 9a)

Paste-ready metadata for the App Store Connect record. **[MARK]** fill in the
bracketed values before submitting.

## Basics

| Field | Value |
|---|---|
| App name | **Food Log — AI Calorie Tracker** |
| Subtitle (30 chars max) | `Say it. Siri logs the macros.` |
| Bundle ID | `com.markscheiber.foodlog` |
| SKU | `foodlog-ios-001` |
| Primary category | Health & Fitness |
| Secondary category | Food & Drink |
| Age rating | 4+ |
| Price | Free |
| Support URL | `[your Netlify site URL]` |
| Privacy policy URL | `[your Netlify site URL]/privacy.html` |

## Keywords (100 chars max)

```
calorie,tracker,food,log,macro,ai,siri,voice,diet,protein,carbs,widget
```

## Description

```
Log meals in one sentence — Food Log's AI does the rest.

Type (or tell Siri) what you ate, and Food Log estimates calories, protein,
carbs, fat, and sugars instantly. No barcode scanning, no database searching,
no friction.

VOICE LOGGING WITH SIRI
Set up the free "Log Food" shortcut once, then just say "Hey Siri, Log Food."
Tell Siri what you ate and hear back the calories — hands free, without
opening the app.

AI MACRO ESTIMATES
Describe a meal in plain language ("2 eggs and toast", "large chicken burrito")
and get realistic nutrition estimates with a confidence score.

YOUR DAY AT A GLANCE
• Calorie ring showing progress toward your daily goal
• Macro breakdown (protein / carbs / fat)
• 7-day calorie trend
• Home screen widget with today's totals

PRIVATE BY DESIGN
Your food log belongs to you alone. Sign in with Apple, and delete your
account and all data any time, right from Settings.

Note: nutrition values are AI estimates for convenience and general wellness
tracking. Food Log is not a medical device and does not provide medical or
dietary advice.
```

## Promotional text (170 chars, editable without review)

```
Say "Hey Siri, Log Food" and hear your calories back. AI estimates macros
from a plain-language description — the fastest way to keep a food log.
```

## What's New (v1.0)

```
First release: AI macro estimates, Siri voice logging, daily calorie ring,
weekly trend, and a home screen widget.
```

## Screenshots **[MARK]**

Required sizes: 6.7" (1290×2796) and 6.1" (1179×2556). Capture from Simulator
(Mac) or your iPhone: (1) dashboard with logged meals, (2) the log input with
a fresh AI result, (3) Siri setup screen, (4) the widget on a home screen.

## App Privacy "nutrition label"

| Data type | Collected? | Linked to user | Tracking |
|---|---|---|---|
| Contact info → Email address | Yes (account) | Yes | No |
| Health & Fitness → Nutrition | Yes (food logs) | Yes | No |
| Identifiers → User ID | Yes (account) | Yes | No |
| Anything else | No | — | — |

Third-party processing disclosure: food descriptions are sent to Anthropic's
API to estimate nutrition; Supabase hosts authentication and the database.

## Review notes (paste into App Review Information)

```
DEMO ACCOUNT
Email: [create a demo account and put its email here]
Sign in via "or use email": enter the email, then the 6-digit code.
NOTE FOR REVIEW: use the demo email [demo email] — we can share a mailbox
view on request, or provide a fixed OTP test account if preferred.

HOW TO TEST
1. Sign in (Sign in with Apple or email code).
2. On the main screen, type "chicken sandwich" into "What did you eat?" and
   tap Log. An AI estimate appears and today's totals update.
3. Settings (gear icon) → edit daily goal, sign out, or Delete account &
   all data (guideline 5.1.1(v) — deletion is immediate and permanent).

SIRI SHORTCUT (OPTIONAL)
The Siri shortcut is an optional convenience configured in-app
(Settings → Siri). It is not required to use any feature.

AI DISCLOSURE
Nutrition values are approximate AI estimates for general wellness tracking.
The app makes no medical claims and provides no medical advice.
```

## Rejection risks — pre-flight checklist

- [x] Sign in with Apple offered (guideline 4.8) — built
- [x] In-app account deletion (guideline 5.1.1(v)) — built, Settings screen
- [ ] Privacy policy URL live before submission (`privacy.html` is in the repo;
      deploys with the Netlify site)
- [ ] Demo account created and credentials verified working
- [x] Widget shows "Open the app to sign in" instead of crashing with no session
