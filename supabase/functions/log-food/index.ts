// log-food — Supabase Edge Function (Phase 2 of docs/IOS_LAUNCH_PLAN.md)
//
// POST /functions/v1/log-food
//   { "food": "chicken sandwich", "token": "<raw shortcut token>" }   (Siri Shortcut)
//   or Authorization: Bearer <user JWT> + { "food": "..." }           (the app)
//
// Deploy with:  supabase functions deploy log-food --no-verify-jwt
// (auth is handled inside — the Shortcut can't mint Supabase JWTs)
//
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    food_name: { type: "string" }, // cleaned-up display name
    calories: { type: "integer" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    sugars_g: { type: "number" },
    confidence: { type: "integer" }, // 0-100
    spoken_summary: { type: "string" }, // one sentence Siri reads aloud
  },
  required: [
    "food_name",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "sugars_g",
    "confidence",
    "spoken_summary",
  ],
  additionalProperties: false,
} as const;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Resolve the caller to a user id: app JWT first, then shortcut token.
async function resolveUser(
  req: Request,
  body: { token?: string },
): Promise<{ userId: string; source: "app" | "siri" } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(jwt);
    if (!error && data.user) return { userId: data.user.id, source: "app" };
  }

  if (body.token && typeof body.token === "string") {
    const hash = await sha256Hex(body.token.trim());
    const { data: row } = await supabaseAdmin
      .from("shortcut_tokens")
      .select("id, user_id")
      .eq("token_hash", hash)
      .maybeSingle();
    if (row) {
      await supabaseAdmin
        .from("shortcut_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", row.id);
      return { userId: row.user_id, source: "siri" };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: { food?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const auth = await resolveUser(req, body);
  if (!auth) {
    return json(401, {
      error: "Unauthorized",
      summary: "Sorry, I couldn't verify your Food Log token.",
    });
  }

  const food = (body.food ?? "").trim();
  if (!food || food.length > 500) {
    return json(400, {
      error: "Invalid food description",
      summary: "Sorry, I didn't catch what you ate — try again.",
    });
  }

  let data: {
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    sugars_g: number;
    confidence: number;
    spoken_summary: string;
  };
  try {
    const resp = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "You are a nutrition estimator. Given a food description, estimate nutrition for a typical " +
        "single serving unless a quantity is stated. Be realistic; set confidence 0-100 based on how " +
        "specific the description is. spoken_summary is one short sentence a voice assistant reads " +
        'aloud, e.g. "Logged chicken sandwich — about 550 calories."',
      messages: [{ role: "user", content: food }],
      output_config: {
        format: { type: "json_schema", schema: NUTRITION_SCHEMA },
      },
    });
    const text = resp.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text block in AI response");
    data = JSON.parse(text.text);
  } catch (err) {
    console.error("AI estimation failed:", err);
    return json(502, {
      error: "AI estimation failed",
      summary: "Sorry, I couldn't log that — try again.",
    });
  }

  // Service-role insert; user_id always comes from auth, never from the body.
  const { data: log, error: insertError } = await supabaseAdmin
    .from("food_logs")
    .insert({
      user_id: auth.userId,
      food: data.food_name,
      calories: data.calories,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
      sugars_g: data.sugars_g,
      confidence: data.confidence,
      source: auth.source,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert failed:", insertError);
    return json(500, {
      error: "Failed to save log",
      summary: "Sorry, I couldn't save that — try again.",
    });
  }

  return json(200, { summary: data.spoken_summary, log });
});
