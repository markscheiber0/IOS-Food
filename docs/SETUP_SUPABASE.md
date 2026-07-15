# Supabase setup — Mark's manual steps

> **[MARK]** Everything the code needs from you, in order. ~30 minutes total.
> The code (migrations, functions, app) is already written and in this repo.

## 1. Create the project

1. supabase.com → New project (free tier). Any region close to you.
2. Record from **Settings → API**:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` key — **secret**, never goes in the app or the repo.

## 2. Apply the schema

Option A — dashboard (fastest): SQL Editor → paste the contents of
`supabase/migrations/20260715000000_initial_schema.sql` → Run.

Option B — CLI:
```bash
npm i -g supabase
supabase login
supabase link --project-ref <ref>
supabase db push
```

## 3. Deploy the Edge Functions

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # console.anthropic.com → API keys
supabase functions deploy log-food --no-verify-jwt   # it does its own auth (Siri tokens)
supabase functions deploy delete-account             # JWT verified by the gateway
```

Smoke test (should 401):
```bash
curl -X POST https://<ref>.supabase.co/functions/v1/log-food \
  -H "Content-Type: application/json" -H "apikey: <anon key>" \
  -d '{"food":"chicken sandwich","token":"bogus"}'
```
Then create a real token from the app's Siri screen (or insert a hash by hand)
and repeat with it — you should get a summary and a row in `food_logs`.

## 4. Enable auth providers

Dashboard → **Authentication → Providers**:

1. **Email** — enable; turn ON "Email OTP". (The app uses 6-digit codes, no
   magic links, so no redirect URL config is needed.)
2. **Apple** — enable. This needs values from the Apple Developer portal:
   - Register the App ID `com.markscheiber.foodlog` with the **Sign in with
     Apple** and **App Groups** (`group.com.markscheiber.foodlog`) capabilities
     (portal → Identifiers).
   - Because the app uses the **native** `expo-apple-authentication` flow
     (identity token → `signInWithIdToken`), add the **bundle ID**
     `com.markscheiber.foodlog` to the Apple provider's "Authorized Client IDs"
     in Supabase. (The Services-ID + secret-key flow is only needed for web
     OAuth — not used here.)

## 5. Fill in the app's .env

`food-log-mobile/.env` (copy from `.env.example`):
```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
APPLE_TEAM_ID=<Xcode → Settings → Accounts>
SIRI_SHORTCUT_URL=<after publishing the shortcut — docs/SIRI_SHORTCUT.md>
```
The same `.env` values are needed on the Mac before `npx expo prebuild`.

## 6. Acceptance checks (from the launch plan)

- [ ] Two test users created; user A cannot read user B's `food_logs` via the
      anon-key PostgREST API (RLS check).
- [ ] `curl` with a valid shortcut token inserts a row with sane macros; a bad
      token returns 401.
- [ ] Fresh install → sign up → log "2 eggs and toast" → ring/macros update;
      a second account sees an empty log.

## 7. Optional: migrate the old sheet data

See `scripts/migrate-sheet-to-supabase.mjs` (dry-runs by default; `--commit`
to insert). Needs your `auth.users` id (dashboard → Authentication → Users).
