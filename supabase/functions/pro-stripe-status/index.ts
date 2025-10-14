// supabase/functions/pro-stripe-status/index.ts
import Stripe from "npm:stripe@^16.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
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
  if (req.method === "OPTIONS") return json({}, 200);

  const REQUIRED = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
  ];
  const missing = REQUIRED.filter((k) => !Deno.env.get(k));
  if (missing.length) return json({ error: "missing_env", missing }, 500);

  try {
    const { pro_user_id } = await req.json().catch(() => ({}));
    if (!pro_user_id) return json({ error: "bad_request", hint: "Falta pro_user_id" }, 400);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pro, error: proErr } = await supa
      .from("professionals")
      .select("stripe_account_id")
      .eq("user_id", pro_user_id)
      .single();

    if (proErr || !pro?.stripe_account_id)
      return json({ error: "pro_without_stripe_account" }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const account = await stripe.accounts.retrieve(pro.stripe_account_id);

    // Lo esencial para UI
    const status = {
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      disabled_reason: account.requirements?.disabled_reason ?? null,
      outstanding_requirements: account.requirements?.currently_due ?? [],
    };

    return json({ status });
  } catch (e) {
    return json({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
