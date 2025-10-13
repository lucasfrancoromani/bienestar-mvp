// @ts-nocheck
// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@16.9.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

// ✅ Usar la API nativa del runtime elimina el error de runMicrotasks
Deno.serve(async (req: Request) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    // En Deno debe usarse la versión asíncrona
    event = await stripe.webhooks.constructEventAsync(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${(err as any).message}`, { status: 400 });
  }

  try {
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const booking_id = String(pi.metadata?.booking_id || "");

      if (booking_id) {
        await supabase
          .from("bookings")
          .update({ payment_status: "paid", paid_at: new Date().toISOString() })
          .eq("id", booking_id)
          .in("payment_status", ["requires_payment", "requires_action", "canceled"]);
      }

      const { data: exists } = await supabase
        .from("transactions")
        .select("id")
        .eq("stripe_payment_intent", pi.id)
        .limit(1)
        .maybeSingle();

      if (!exists) {
        await supabase.from("transactions").insert({
          booking_id: booking_id || null,
          stripe_payment_intent: pi.id,
          amount_cents: Number(pi.amount || 0),
          application_fee_cents: Number(pi.application_fee_amount || 0),
          currency: pi.currency || "usd",
          payout_status: "pending",
        });
      }
    }

    if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const booking_id = String(pi.metadata?.booking_id || "");
      if (booking_id) {
        await supabase
          .from("bookings")
          .update({ payment_status: "failed" })
          .eq("id", booking_id)
          .neq("payment_status", "paid");
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(`Handler error: ${e.message || e}`, { status: 500 });
  }
});
