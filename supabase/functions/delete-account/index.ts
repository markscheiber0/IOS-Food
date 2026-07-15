// delete-account — Supabase Edge Function
// Required by App Store guideline 5.1.1(v): in-app account deletion.
//
// POST /functions/v1/delete-account with Authorization: Bearer <user JWT>.
// Deletes the auth user; profiles / food_logs / shortcut_tokens cascade.
//
// Deploy with:  supabase functions deploy delete-account

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    data.user.id,
  );
  if (deleteError) {
    console.error("Account deletion failed:", deleteError);
    return new Response(JSON.stringify({ error: "Deletion failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
