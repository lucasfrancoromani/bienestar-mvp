// supabase/functions/pro-stripe-onboarding/index.ts
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

  // 0) Chequeo de variables de entorno
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
    const { pro_user_id } = await req.json().catch(() => ({}));
    if (!pro_user_id) return jsonResponse({ error: "bad_request", hint: "Falta pro_user_id" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Traer el account_id del Pro
    const { data: pro, error: proErr } = await supabaseAdmin
      .from("professionals")
      .select("stripe_account_id")
      .eq("user_id", pro_user_id)
      .single();

    if (proErr || !pro?.stripe_account_id) {
      return jsonResponse({ error: "pro_without_stripe_account", detail: proErr?.message ?? "No hay stripe_account_id" }, 404);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    // Crear link de onboarding
    let link;
    try {
      link = await stripe.accountLinks.create({
        account: pro.stripe_account_id,
        type: "account_onboarding",
        return_url: Deno.env.get("ONBOARDING_RETURN_URL")!,
        refresh_url: Deno.env.get("ONBOARDING_REFRESH_URL")!,
      });
    } catch (e) {
      return jsonResponse({ error: "stripe_error", detail: (e as Error).message }, 500);
    }

    return jsonResponse({ url: link.url });
  } catch (e) {
    return jsonResponse({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
