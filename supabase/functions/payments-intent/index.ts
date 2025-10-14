// supabase/functions/payments-intent/index.ts
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

  // 0) Env check
  const REQUIRED = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRODUCT_COMMISSION_PERCENT",
  ];
  const missing = REQUIRED.filter((k) => !Deno.env.get(k));
  if (missing.length) return json({ error: "missing_env", missing }, 500);

  try {
    const { booking_id } = await req.json().catch(() => ({}));
    if (!booking_id) return json({ error: "bad_request", hint: "Falta booking_id" }, 400);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Traer booking (sin joins) — OJO: usamos pro_id (no professional_id)
    const { data: booking, error: bErr } = await supa
      .from("bookings")
      .select("id, total_cents, pro_id, service_id, status")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return json({ error: "booking_not_found", detail: bErr?.message ?? "No existe booking" }, 404);
    }
    if (!booking.total_cents || booking.total_cents <= 0) {
      return json({ error: "invalid_amount", hint: "total_cents vacío o inválido en la reserva" }, 400);
    }
    if (!booking.pro_id) {
      return json({ error: "booking_missing_pro", hint: "La reserva no tiene pro_id" }, 400);
    }

    // 2) Traer profesional por user_id (tu modelo usa user_id como PK en professionals)
    const { data: pro, error: pErr } = await supa
      .from("professionals")
      .select("stripe_account_id")
      .eq("user_id", booking.pro_id)
      .single();

    if (pErr || !pro?.stripe_account_id) {
      return json({
        error: "pro_has_no_stripe_account",
        hint: "El profesional no tiene stripe_account_id o no existe en professionals",
        detail: pErr?.message ?? null,
      }, 400);
    }
    const destination = pro.stripe_account_id;

    // 3) Chequear que la cuenta del Pro esté lista para cobrar
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const account = await stripe.accounts.retrieve(destination);
    if (!account.charges_enabled) {
      return json({ error: "pro_stripe_not_ready", hint: "El Pro aún no puede cobrar (charges_enabled=false)" }, 400);
    }

    // 4) Calcular fee (defensivo)
    const feePercentStr = Deno.env.get("STRIPE_PRODUCT_COMMISSION_PERCENT")!;
    const feePercent = Number(feePercentStr);
    if (!Number.isFinite(feePercent) || feePercent < 0) {
      return json({ error: "bad_fee_config", hint: "STRIPE_PRODUCT_COMMISSION_PERCENT inválido" }, 500);
    }
    const amount = Number(booking.total_cents);
    const applicationFeeCents = Math.round((feePercent / 100) * amount);

    // 5) Crear PaymentIntent con split
    let intent;
    try {
      intent = await stripe.paymentIntents.create({
        amount,
        currency: "eur", 
        automatic_payment_methods: { enabled: true },
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination },
        metadata: {
          booking_id: booking.id,
          pro_account: destination,
          service_id: booking.service_id ?? "",
        },
      });
    } catch (e) {
      return json({ error: "stripe_error", detail: (e as Error).message }, 500);
    }

    return json({
      client_secret: intent.client_secret,
      amount,
      application_fee_cents: applicationFeeCents,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
