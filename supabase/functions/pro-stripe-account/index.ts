// supabase/functions/pro-stripe-account/index.ts

import Stripe from "npm:stripe@^16.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse({}, 200);

  // 0) Chequeo de variables de entorno (para errores 500 más claros)
  const REQUIRED = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "ONBOARDING_RETURN_URL",
    "ONBOARDING_REFRESH_URL",
  ];
  const missing = REQUIRED.filter((k) => !Deno.env.get(k));
  if (missing.length) {
    return jsonResponse(
      { error: "missing_env", missing, hint: "Cargá estos secrets en Supabase → Project Settings → Configuration → Functions/Secrets y redeploy." },
      500
    );
  }

  try {
    const { pro_user_id, email } = await req.json().catch(() => ({}));
    if (!pro_user_id) return jsonResponse({ error: "bad_request", hint: "Falta pro_user_id" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role (solo servidor)
    );

    // ¿Existe el profesional?
    const { data: pro, error: proErr } = await supabaseAdmin
      .from("professionals")
      .select("user_id, stripe_account_id")
      .eq("user_id", pro_user_id)
      .single();

    if (proErr) {
      console.error("DB read error:", proErr);
      return jsonResponse({ error: "professional_not_found", detail: proErr.message }, 404);
    }

    if (pro?.stripe_account_id) {
      return jsonResponse({ account_id: pro.stripe_account_id, already_exists: true });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    let account;
    try {
      account = await stripe.accounts.create({
        type: "standard",
        email: email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: "individual",
      });
    } catch (e) {
      console.error("Stripe error:", e);
      return jsonResponse({ error: "stripe_error", detail: (e as Error).message }, 500);
    }

    const { error: updErr } = await supabaseAdmin
      .from("professionals")
      .update({ stripe_account_id: account.id })
      .eq("user_id", pro_user_id);

    if (updErr) {
      console.error("DB update error:", updErr);
      return jsonResponse({ error: "db_update_failed", detail: updErr.message }, 500);
    }

    return jsonResponse({ account_id: account.id, already_exists: false });
  } catch (e) {
    console.error("Unhandled error:", e);
    return jsonResponse({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
