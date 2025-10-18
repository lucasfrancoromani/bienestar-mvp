// supabase/functions/payments-webhook/index.ts
// Marca bookings como paid/failed según eventos de Stripe (PaymentIntent).

import Stripe from "npm:stripe@^16.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_WEBHOOK_SECRET"];
  const missing = REQUIRED.filter((k) => !Deno.env.get(k));
  if (missing.length) return json({ error: "missing_env", missing }, 500);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "no_signature" }, 400);

  // ⚠️ leer RAW body y usar verificación ASÍNCRONA
  const raw = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-06-20" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    return json(
      { error: "signature_verification_failed", detail: (err as Error).message },
      400
    );
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  async function markBooking(bookingId: string, patch: Record<string, unknown>) {
    const { error } = await supa.from("bookings").update(patch).eq("id", bookingId);
    if (error) throw new Error(error.message);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = (pi.metadata?.booking_id as string) || "";
        if (bookingId) {
          await markBooking(bookingId, {
            status: "paid",
            payment_intent_id: pi.id,
            paid_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = (pi.metadata?.booking_id as string) || "";
        if (bookingId) {
          await markBooking(bookingId, {
            status: "failed",
            payment_intent_id: pi.id,
          });
        }
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = (pi.metadata?.booking_id as string) || "";
        if (bookingId) {
          await markBooking(bookingId, {
            status: "processing_payment",
            payment_intent_id: pi.id,
          });
        }
        break;
      }
      default:
        // no-op
        break;
    }
    return json({ received: true });
  } catch (err) {
    return json({ error: "handler_failed", detail: (err as Error).message }, 500);
  }
});