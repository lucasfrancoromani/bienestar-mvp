// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@16.9.0?target=deno";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET_STRIPE = Deno.env.get("STRIPE_WEBHOOK_SECRET_STRIPE") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "missing_signature_header" }, 400);

  const rawBody = await req.text();

  try {
    await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET_STRIPE, { tolerance: 60 });
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return json({ error: "signature_verification_failed" }, 400);
  }

  // Si querés lógica aquí, agregala. Si no, devolvemos 200 para cortar reintentos.
  return json({ received: true }, 200);
});
