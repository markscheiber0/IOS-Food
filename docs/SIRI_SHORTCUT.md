# "Log Food" Apple Shortcut — build & publish recipe

> **[MARK]** Build this once in the Shortcuts app on your iPhone, share it as an
> iCloud link, and put that link in `food-log-mobile/.env` as `SIRI_SHORTCUT_URL`.
> Each user personalizes it with their own token from the app's Siri setup screen.

## Prerequisites

- The `log-food` Edge Function is deployed (`supabase functions deploy log-food --no-verify-jwt`).
- You have your Supabase **project URL** and **anon key** (dashboard → Settings → API).

## Build the shortcut (Shortcuts app → + New Shortcut)

Add these actions in order:

1. **Ask for Input**
   - Input type: **Text**
   - Prompt: **What did you eat?**
   - (When run via Siri, this becomes a voice question.)

2. **Text** — paste your token here for your own testing. Before sharing, this
   becomes an **Import Question** (see "Publish" below). Call it the token field.

3. **Get Contents of URL**
   - URL: `https://<project-ref>.supabase.co/functions/v1/log-food`
   - Method: **POST**
   - Headers:
     - `Content-Type`: `application/json`
     - `apikey`: `<your anon key>`
   - Request Body: **JSON**
     - `token` (Text): the **Text** variable from step 2
     - `food` (Text): **Provided Input** from step 1

4. **Get Dictionary Value**
   - Get **Value** for key **summary** in **Contents of URL**

5. **Show Result**
   - Content: **Dictionary Value**
   - (When invoked by voice, Siri speaks this aloud — e.g. "Logged chicken
     sandwich — about 550 calories.")

## Name it

Rename the shortcut to **Log Food** — the invocation phrase is automatically
**"Hey Siri, Log Food"**.

## Test it

Run it once by hand, then by voice. Expected: Siri asks "What did you eat?",
you answer, Siri reads back the summary, and the row appears in the app
(source badge: `siri`) within one refresh.

Failure modes:
- *"Sorry, I couldn't verify your Food Log token"* → wrong/missing token in step 2.
- Silence or an error dictionary → check the function logs:
  `supabase functions logs log-food`.

## Publish (share link with Import Question)

1. In the shortcut editor, tap the token **Text** action → tap the text →
   **Ask Each Time** is NOT what we want (that would prompt per run). Instead:
2. Share sheet → **Share Shortcut** → **iCloud link**. Before sharing, Shortcuts
   asks which fields should be **Import Questions** — mark the token Text field
   as an import question with the prompt:
   **"Paste your token from the Food Log app (Settings → Siri)"**.
3. Copy the iCloud URL into `food-log-mobile/.env`:
   `SIRI_SHORTCUT_URL=https://www.icloud.com/shortcuts/...`
4. Rebuild/redeploy the app config (the URL is read at build time).

Re-publish the link (and update `.env`) any time the recipe changes — iCloud
links are snapshots, not live references.

## Acceptance (from the launch plan)

On a phone with the app signed in: "Hey Siri, Log Food" → "What did you eat?" →
"chicken sandwich" → Siri speaks "Logged chicken sandwich — about 550
calories…" → row visible in the app within one refresh.
