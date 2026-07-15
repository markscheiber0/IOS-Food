# Food Log — iOS App Store Launch Plan

> **Handoff document.** This plan is written to be executed by an implementation agent (Opus) with
> minimal additional context. Read the whole file before starting. Work through phases in order —
> each phase ends with acceptance criteria that must pass before moving on. The human owner is
> Mark Scheiber (markscheiber0@gmail.com); items tagged **[MARK]** require his manual action
> (accounts, keys, Apple portal) and cannot be done by the agent.

---

## 1. Current state (what exists today)

```
food-log/
├── index.html / script.js / style.css   Web app — reads ONE shared Google Sheet
├── netlify/functions/sheets.js          Netlify proxy hiding the Google Sheets API key
└── food-log-mobile/                     Expo (SDK 52) React Native app
    ├── app/                             expo-router screens (single screen)
    ├── src/api/sheets.ts                Google Sheets fetch + row parsing
    ├── src/hooks/useSheetData.ts        Fetch/cache/auto-refresh
    ├── src/components/                  CalorieRing, MacroBreakdown, WeeklyTrend, MealsList
    └── targets/food-log-widget/         iOS WidgetKit extension (Swift, fetches Sheets directly)
```

Limitations being fixed by this plan:
- **Single user.** Everyone reads/writes the same Google Sheet. No accounts, no isolation.
- **No write path from the phone.** Logging happens elsewhere; the app is read-only.
- **No AI.** Macros are entered manually into the sheet.
- **Not distributable.** Sideload-only instructions; no App Store pipeline.

**Dev machine split:** Mark codes on **Windows** (this machine). All *code* work in this plan
(Phases 1–5, and the git-committable parts of Phase 6) happens here and is pushed to **GitHub**.
Mark has a **MacBook with Xcode** and an active **Apple Developer Program membership**, which does
the actual `prebuild` → archive → TestFlight/App Store upload. Concretely: agent writes code on
Windows → commits/pushes to GitHub → Mark (or the agent, if given shell access on the Mac) pulls
the repo on the Mac → runs `npx expo prebuild` and opens the generated `ios/*.xcworkspace` in
Xcode → archives and uploads via Xcode Organizer or `xcodebuild`/`fastlane`. EAS Build (cloud) is
documented as a fallback in Phase 6 but is no longer the primary path now that local Xcode is
available.

## 2. Target architecture

```
                    ┌────────────────────────────────────────────┐
 iPhone             │                Supabase                     │
 ┌────────────┐     │  ┌──────────┐   ┌───────────────────────┐  │
 │ Expo app   │──►──┤  │ Auth     │   │ Postgres              │  │
 │ (accounts, │     │  │ (Apple + │   │  food_logs (RLS:      │  │
 │  dashboard)│──◄──┤  │  email)  │   │  user sees own rows)  │  │
 └────────────┘     │  └──────────┘   └───────────▲───────────┘  │
 ┌────────────┐     │                             │              │
 │ Siri       │     │  ┌──────────────────────────┴───────────┐  │
 │ Shortcut   │──►──┤  │ Edge Function: log-food               │  │
 │ "Log Food" │──◄──┤  │  validate token → call Claude for     │  │
 └────────────┘     │  │  macros → insert row → return summary │──┼──► Anthropic API
 ┌────────────┐     │  └───────────────────────────────────────┘  │   (macro extraction,
 │ WidgetKit  │──►──┤   (widget reads via PostgREST + user JWT)   │    structured JSON)
 └────────────┘     └────────────────────────────────────────────┘
```

**Key decisions (already made — do not re-litigate):**

| Decision | Choice | Why |
|---|---|---|
| Backend | **Supabase** (free tier) | Postgres + Row Level Security gives per-user data isolation for free; built-in Auth with Sign in with Apple; Edge Functions (Deno/TypeScript) host the AI call; PostgREST gives the widget a simple authenticated REST read. Firebase would also work but RLS + SQL fits the existing tabular data model better. |
| AI call location | **Synchronous inside the `log-food` Edge Function** | The Shortcut POSTs the food text; the function calls Claude, inserts a *complete* row, and returns a summary string that **Siri speaks back** ("Logged chicken sandwich — about 550 calories"). A DB-trigger→AI pipeline (insert pending row, webhook fires, AI updates row) is the fallback if latency is ever a problem, but it makes Siri unable to speak the result. Build synchronous first. |
| AI model | **`claude-opus-4-8`** via the Anthropic Messages API with structured outputs (`output_config.format` json_schema). $5/$25 per MTok — a food-log call is ~300 input / ~150 output tokens ≈ **half a cent per log**. If Mark later wants it cheaper, `claude-haiku-4-5` ($1/$5) is a one-line model-string swap — that is his call, not the agent's. |
| Siri integration (v1) | **Apple Shortcuts** shared via iCloud link, personalized with the user's log token | Zero native code, works today, user sets it up once from an in-app onboarding screen. Native App Intents ("Hey Siri, log food" with no setup) is a v2 item — it requires a custom Expo native target; do not attempt it in v1. |
| Auth methods | **Sign in with Apple + email OTP (magic link/code)** | Apple's review guideline 4.8: if you offer third-party login you must offer Sign in with Apple. Offering SIWA + email satisfies review and covers non-Apple account recovery. |
| iOS builds | **Local Xcode on the Mac, fed by `expo prebuild`** | Code is written on Windows and pushed to GitHub; the Mac pulls, runs `prebuild`, and does the archive/upload in Xcode (or `fastlane`/`xcodebuild` CLI once the flow is proven manually). This gives full control over the `expo-apple-targets` widget target and avoids EAS cloud-build queue times/costs. **EAS Build + `eas submit`** remains documented in Phase 6 as a fallback if the Mac is ever unavailable. |
| Git workflow | **GitHub is the Windows→Mac bridge** | Windows never has Xcode, so it never runs `prebuild` or opens `ios/`. The generated `ios/` and `android/` directories are gitignored (standard Expo practice — they're regenerated from `app.config.js` + `targets/`, not hand-edited) so only source (`app/`, `src/`, `targets/*.swift`, config) crosses the wire. |

---

## 3. Phase 0 — Accounts & prerequisites  **[MARK — all of these]**

1. ~~**Apple Developer Program**~~ — **done.** Mark is enrolled ($99/yr, developer.apple.com).
2. **Supabase** — create a project at supabase.com (free tier is fine). Record: project URL,
   `anon` key, `service_role` key (keep service_role secret).
3. **Anthropic API key** — console.anthropic.com → API keys. This key lives ONLY in Supabase Edge
   Function secrets, never in the app bundle.
4. **GitHub repo** — push this project (if not already) to a GitHub repo Mark can clone on the
   Mac. This is the Windows→Mac handoff mechanism for Phase 6 — no separate Expo/EAS account is
   required unless the EAS-fallback build path in Phase 6 is used later.
5. **On the Mac:** confirm Xcode (latest stable) is installed, Xcode → Settings → Accounts has
   Mark's Apple ID signed in with the Developer Program team visible, and `node`/`npm` are
   installed (same major Node version as the Windows machine, to avoid `prebuild` drift).
6. Pick the final **bundle ID** (e.g. `com.markscheiber.foodlog`) and register the App ID in the
   Apple Developer portal with capabilities: Sign in with Apple, App Groups
   (`group.com.markscheiber.foodlog`). This can be done from the portal on either machine — it's
   just a web form.

## 4. Phase 1 — Supabase schema, RLS, auth

Create via SQL migration (check the file into `supabase/migrations/`):

```sql
-- profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  daily_goal int not null default 2000,
  created_at timestamptz not null default now()
);

-- food_logs: the core table (mirrors the old sheet columns)
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food text not null,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  sugars_g numeric,
  confidence int,           -- 0-100 from the AI
  source text not null default 'app',   -- 'app' | 'siri'
  logged_at timestamptz not null default now()
);
create index on public.food_logs (user_id, logged_at desc);

-- shortcut_tokens: long-lived tokens for the Siri Shortcut (Shortcuts can't refresh JWTs)
create table public.shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,      -- sha256 of the raw token; raw shown to user once
  label text default 'Siri Shortcut',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
```

**RLS — this is the multi-user isolation requirement. Non-negotiable:**

```sql
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.shortcut_tokens enable row level security;

create policy "own profile"   on public.profiles       for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own logs"      on public.food_logs      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tokens"    on public.shortcut_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Also: a trigger on `auth.users` insert that creates the `profiles` row.

**Auth config (Supabase dashboard + Apple portal) [MARK assists]:** enable Email (OTP) provider and
Apple provider. Apple provider needs a Services ID + key from the Apple Developer portal —
follow Supabase's "Login with Apple" guide for Expo (`expo-apple-authentication` native flow
passes the identity token to `supabase.auth.signInWithIdToken`).

**Acceptance:** two test users created via SQL/dashboard; user A cannot select user B's
`food_logs` rows through the anon-key PostgREST API.

## 5. Phase 2 — Edge Function `log-food` (the AI pipeline)

`supabase/functions/log-food/index.ts` (Deno / TypeScript). Secrets via
`supabase secrets set ANTHROPIC_API_KEY=...`.

Request (from Siri Shortcut or the app):
```json
POST /functions/v1/log-food
{ "token": "<raw shortcut token>", "food": "chicken sandwich" }
```
(App calls may instead send the user's Supabase JWT in the Authorization header — support both:
JWT → `auth.uid()`; token → sha256 lookup in `shortcut_tokens`.)

Flow:
1. Resolve `user_id` from JWT or shortcut token (update `last_used_at`). 401 if neither resolves.
2. Reject empty/absurd input (>500 chars) early.
3. Call the Anthropic Messages API (`claude-opus-4-8`) with **structured outputs** so the response
   is guaranteed-parseable JSON:

```ts
import Anthropic from "npm:@anthropic-ai/sdk";
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

const resp = await anthropic.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 1024,
  system:
    "You are a nutrition estimator. Given a food description, estimate nutrition for a typical " +
    "single serving unless a quantity is stated. Be realistic; set confidence 0-100 based on how " +
    "specific the description is.",
  messages: [{ role: "user", content: food }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          food_name:  { type: "string" },   // cleaned-up display name
          calories:   { type: "integer" },
          protein_g:  { type: "number" },
          carbs_g:    { type: "number" },
          fat_g:      { type: "number" },
          sugars_g:   { type: "number" },
          confidence: { type: "integer" },
          spoken_summary: { type: "string" } // one sentence Siri will read aloud
        },
        required: ["food_name","calories","protein_g","carbs_g","fat_g","sugars_g","confidence","spoken_summary"],
        additionalProperties: false
      }
    }
  }
});
const data = JSON.parse(resp.content.find(b => b.type === "text").text);
```

4. Insert the row into `food_logs` with the **service-role client** (RLS bypass is fine here — the
   function itself is the trust boundary; always set `user_id` from step 1, never from the body).
5. Return `200 { "summary": data.spoken_summary, "log": {...} }`. On AI failure, insert nothing and
   return a spoken-friendly error ("Sorry, I couldn't log that — try again.").

**Note on the "database trigger → AI" pattern** Mark described: the synchronous design above
achieves the same outcome (row lands in the DB fully enriched) with better Siri UX. If a
fire-and-forget path is ever needed, add a `status='pending'` insert + Supabase Database Webhook
→ this same function. Do not build that in v1.

**Acceptance:** `curl` the deployed function with a test token → row appears in `food_logs` with
sane macros; wrong token → 401; the summary string reads naturally aloud.

## 6. Phase 3 — Mobile app changes (`food-log-mobile/`)

1. **Add deps:** `@supabase/supabase-js`, `expo-apple-authentication`, `expo-secure-store`
   (session + widget token storage), `expo-clipboard`.
2. **Auth flow:** new `app/(auth)/sign-in.tsx` — Sign in with Apple button + email OTP fallback.
   Session persisted with a SecureStore adapter. Root layout redirects signed-out users.
3. **Replace the data layer:** delete `src/api/sheets.ts` usage; new `src/api/logs.ts` querying
   `food_logs` for today + trailing 7 days via supabase-js. Keep the four dashboard components and
   `useSheetData`'s shape (rename to `useFoodLogs`) so the UI barely changes. Daily goal comes from
   `profiles.daily_goal`.
4. **In-app logging:** add a text input ("What did you eat?") on the main screen that calls
   `log-food` with the user's JWT, then refreshes. This also serves as the App Review demo path.
5. **Settings screen:** edit daily goal, sign out, **Delete account** (Apple guideline 5.1.1(v) —
   mandatory since the app has accounts; call a small `delete-account` Edge Function that
   `auth.admin.deleteUser`s and cascades), and the Siri setup section (below).
6. **Siri onboarding screen (`app/siri-setup.tsx`):**
   - Button **"Generate my Siri token"** → app creates a random 32-byte token, stores the sha256 in
     `shortcut_tokens`, shows the raw token once with a copy button.
   - Button **"Add the Log Food shortcut"** → opens the published iCloud shortcut link (Phase 4).
   - Step-by-step instructions with screenshots: install shortcut → paste token when asked →
     say "Hey Siri, Log Food".
   - "Test it" row that shows the newest `food_logs` row with `source='siri'`.
7. **Widget:** update `targets/food-log-widget/FoodLogWidget.swift` to fetch
   `GET {SUPABASE_URL}/rest/v1/food_logs?...&logged_at=gte.<today>` with the anon key + the user's
   access token. Share credentials app→widget via App Group `UserDefaults(suiteName:)` (token
   refresh: app writes a fresh access token on foreground; widget falls back to cached data on
   401). Remove all Google Sheets code and keys.
8. **Cleanup:** remove `.env` Google keys from the mobile app; `app.config.js` now carries only
   `SUPABASE_URL` + `SUPABASE_ANON_KEY` (both safe to embed — RLS is the security boundary).

**Acceptance:** fresh install in Expo Go / dev build → sign up → log "2 eggs and toast" in-app →
ring/macros update; second account sees an empty log.

## 7. Phase 4 — The Apple Shortcut  **[MARK builds once, on iPhone]**

Built in the Shortcuts app (agent writes the exact recipe; Mark assembles and publishes):

1. **Ask for Input** — Text, prompt: **"What did you eat?"** (when run via Siri this is voice).
2. **Get Contents of URL** — POST `https://<project>.supabase.co/functions/v1/log-food`,
   JSON body: `{ "token": "<ImportQuestion>", "food": "<Provided Input>" }`,
   header `apikey: <anon key>`.
3. **Get Dictionary Value** — `summary`.
4. **Show Result / Speak** — Siri reads the summary aloud.

Name it **"Log Food"** → invocation phrase is automatically **"Hey Siri, Log Food"**.
Share → **iCloud link**, and mark the token field as an **Import Question** ("Paste your token from
the Food Log app") so each user personalizes it on install. Put the iCloud URL into the app's
Siri onboarding screen. Re-publish the link whenever the recipe changes.

**Acceptance:** on a phone with the app signed in: "Hey Siri, Log Food" → "What did you eat?" →
"chicken sandwich" → Siri speaks "Logged chicken sandwich — about 550 calories…" → row visible in
the app within one refresh.

## 8. Phase 5 — Data migration (optional, Mark's data only)

One-off Node script: read the existing Google Sheet (reuse the key from `netlify/functions/`),
map columns (`Protien (g)` → `protein_g`, `Sugars(g)` → `sugars_g`, timestamps both formats),
insert into `food_logs` under Mark's user ID with the service-role key. Keep the sheet as archive;
retire the Netlify function and web app afterwards (or repoint the web app at Supabase later).

## 9. Phase 6 — Build & App Store submission

### 9a. Windows side (agent does this)

1. Finish and commit all app code (Phases 1–5). Confirm `ios/` and `android/` are in
   `.gitignore` — they're generated output, not source; committing them causes merge pain when
   the Mac regenerates them.
2. Set final identifiers in `app.config.js`: `ios.bundleIdentifier` (matches the App ID from
   Phase 0.6), `ios.appleTeamId` (Mark reads this from Xcode → Settings → Accounts, or the Apple
   Developer portal → Membership), App Group string, version/build number scheme.
3. Prepare **assets**: 1024×1024 icon, splash screen, widget preview image. Keep the existing dark
   `#0f172a` visual identity. These are plain files (`assets/`) — no Mac needed to create them.
4. Draft **App Store Connect metadata** as a checked-in `docs/app-store-listing.md` (name, e.g.
   "Food Log — AI Calorie Tracker"; subtitle; keywords; description; support URL; privacy-policy
   copy) so Mark can paste it in without re-deriving it. Draft **review notes**: demo account
   credentials, note that the Siri Shortcut is optional and set up in-app, and that AI estimates
   are approximate (avoid medical claims — this is a wellness/logging app, not medical advice).
5. Push everything to GitHub, tag or note the commit Mark should build from.

### 9b. Mac side **[MARK]**

1. `git clone`/`git pull` the repo. `npm install`.
2. `npx expo prebuild --clean` — regenerates `ios/` from `app.config.js` + `targets/`. Re-run this
   any time `app.config.js`, `targets/food-log-widget/`, or native deps change; **never hand-edit**
   generated files in `ios/` — fix the source and re-`prebuild`.
3. `open ios/food-log.xcworkspace` (the `.xcworkspace`, not `.xcodeproj`).
4. Signing & Capabilities on **both** the `food-log` target and the `FoodLogWidget` target: Team →
   Mark's Developer Program team; confirm Sign in with Apple and App Groups capabilities are
   present (added automatically from `app.config.js`/`expo-apple-targets` config — verify, don't
   assume).
5. **App Store Connect:** create the app record using the Phase 9a listing draft (name, subtitle,
   keywords, screenshots — capture screenshots from the iOS Simulator on the Mac at the required
   sizes, 6.7" + 6.1", or from Mark's own iPhone).
6. **Privacy:** publish the privacy-policy page (host on the existing Netlify site — mentions
   account data, food log contents, processing of food descriptions by Anthropic's API, and the
   deletion path); fill in App Privacy "nutrition labels" (collects email for account, health &
   fitness data for nutrition, linked to user, not used for tracking); confirm in-app account
   deletion works (built in Phase 3 — reviewers check this).
7. **Archive & upload:** Xcode → Product → Archive → Distribute App → App Store Connect → Upload.
   First build should go to **TestFlight** for internal testing on Mark's phone for a few days of
   real logging before submitting for review.
8. **Submit for review**, using the Phase 9a review notes. Common rejection risks to pre-empt:
   account deletion missing (built), SIWA missing (built), privacy policy URL dead, demo account
   broken, widget crashing on first run with no session (must show a friendly "open the app to
   sign in" placeholder).

### 9c. Fallback — EAS Build (cloud), if the Mac is ever unavailable

`eas.json` with `development`/`preview`/`production` profiles, `eas login`, `eas build --profile
production --platform ios`, `eas submit -p ios`. This runs the equivalent of 9b in Expo's cloud
and needs no Mac, at the cost of build-queue time and EAS's free-tier build cap (~15 iOS
builds/mo). Keep this documented but treat the Mac/Xcode path as primary since Mark now has one.

## 10. Cost expectations (steady state)

| Item | Cost |
|---|---|
| Apple Developer | $99/yr |
| Supabase | $0 (free tier) until real traction, then $25/mo Pro |
| Anthropic API | ~½¢ per logged meal on `claude-opus-4-8` (≈300 in / 150 out tokens at $5/$25 per MTok). 10 users × 5 logs/day ≈ **$7–8/mo**. Swappable to `claude-haiku-4-5` (~1/5 the cost) if desired. |
| Xcode / Mac builds | $0 — local builds on Mark's own Mac |
| EAS Build (fallback only) | Free tier covers ~15 iOS builds/mo, not needed unless the Mac path is unavailable |

## 11. Explicit non-goals for v1

- Native App Intents / no-setup Siri (v2)
- Android
- Photo-based food recognition
- Barcode scanning
- Social features / sharing
- Rewriting the web app (leave it; retire later)

## 12. Suggested execution order for the implementing agent

1. Phase 1 (schema + RLS) → 2 (edge function) — these are testable with curl alone, no Mac
   involvement needed. Do these first.
2. Phase 3 (app) in vertical slices: auth → data layer → in-app logging → settings/deletion →
   Siri onboarding → widget.
3. Phase 4 shortcut recipe doc for Mark.
4. Phase 9a (identifiers + assets + metadata draft) as soon as the bundle ID/App Group are known,
   so the first push to GitHub is Mac-buildable — ask Mark to do a throwaway `prebuild` +
   archive of the widget target *early* (before UI polish) to de-risk it, since that's the
   riskiest single build step. Everything else in 9b/9c waits until the app is feature-complete.

Report progress against the acceptance criteria at the end of each phase.
