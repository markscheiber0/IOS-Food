#!/usr/bin/env node
// One-off migration: Google Sheet → Supabase food_logs (Phase 5 of the launch plan).
// Runs with plain Node 18+ (uses built-in fetch), no npm install needed.
//
// Usage (PowerShell):
//   $env:GOOGLE_SHEETS_API_KEY="AIza..."; $env:GOOGLE_SHEETS_ID="15Ia..."
//   $env:SUPABASE_URL="https://xxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
//   $env:TARGET_USER_ID="<Mark's auth.users id — Supabase dashboard → Authentication>"
//   node scripts/migrate-sheet-to-supabase.mjs           # dry run: prints what it would insert
//   node scripts/migrate-sheet-to-supabase.mjs --commit  # actually inserts

const {
  GOOGLE_SHEETS_API_KEY,
  GOOGLE_SHEETS_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TARGET_USER_ID,
} = process.env;

const COMMIT = process.argv.includes('--commit');

for (const [name, value] of Object.entries({
  GOOGLE_SHEETS_API_KEY,
  GOOGLE_SHEETS_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TARGET_USER_ID,
})) {
  if (!value) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
}

function findIndex(headers, name) {
  return headers.findIndex(h => h && h.toLowerCase().trim() === name.toLowerCase().trim());
}

// "YYYY-MM-DD HH:MM[:SS]" or "MM/DD/YYYY HH:MM[:SS]" → ISO string (local time)
function toISO(raw) {
  const trimmed = raw.trim();
  const [datePart, timePart = '12:00:00'] = trimmed.split(' ');
  let year, month, day;
  if (datePart.includes('/')) {
    [month, day, year] = datePart.split('/').map(Number);
  } else {
    [year, month, day] = datePart.split('-').map(Number);
  }
  const [hh = 12, mm = 0, ss = 0] = timePart.split(':').map(Number);
  const d = new Date(year, month - 1, day, hh, mm, ss);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

const num = v => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

async function main() {
  const range = encodeURIComponent('Sheet1!A:L');
  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status} ${res.statusText}`);
  const { values: rows } = await res.json();
  if (!rows || rows.length < 2) throw new Error('Sheet is empty');

  const headers = rows[0];
  const col = {
    timestamp: findIndex(headers, 'TimeStamp'),
    food: findIndex(headers, 'Food'),
    calories: findIndex(headers, 'Calories'),
    protein: findIndex(headers, 'Protien (g)'), // intentional typo in the sheet
    carbs: findIndex(headers, 'Carbs (g)'),
    fat: findIndex(headers, 'Fat (g)'),
    sugars: findIndex(headers, 'Sugars(g)'),
    confidence: findIndex(headers, 'Confidence(0-100)'),
  };

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ts = row[col.timestamp];
    if (!ts || !row[col.calories]) continue;
    const logged_at = toISO(ts);
    if (!logged_at) {
      console.warn(`Row ${i + 1}: unparseable timestamp "${ts}" — skipped`);
      continue;
    }
    records.push({
      user_id: TARGET_USER_ID,
      food: row[col.food] || 'Unknown',
      calories: Math.round(num(row[col.calories]) ?? 0),
      protein_g: num(row[col.protein]),
      carbs_g: num(row[col.carbs]),
      fat_g: num(row[col.fat]),
      sugars_g: num(row[col.sugars]),
      confidence: Math.round(num(row[col.confidence]) ?? 0),
      source: 'import',
      logged_at,
    });
  }

  console.log(`Parsed ${records.length} rows from the sheet.`);
  console.log('First row:', JSON.stringify(records[0], null, 2));
  console.log('Last row:', JSON.stringify(records[records.length - 1], null, 2));

  if (!COMMIT) {
    console.log('\nDry run only. Re-run with --commit to insert into Supabase.');
    return;
  }

  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/food_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!insertRes.ok) {
      throw new Error(`Insert failed (${insertRes.status}): ${await insertRes.text()}`);
    }
    console.log(`Inserted ${Math.min(i + BATCH, records.length)} / ${records.length}`);
  }

  console.log('Done. The Google Sheet is untouched — keep it as an archive.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
