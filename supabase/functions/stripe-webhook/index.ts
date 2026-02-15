import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const TIER_MAP: Record<string, { tier: string; credits: number }> = {
  "prod_TyltIvYWdZReZo": { tier: "pro", credits: 25 },
  "prod_TyltCrUUsbuddE": { tier: "business", credits: 100 },
  "prod_TyltldO5OcP5cE": { tier: "scale", credits: 999 },
  // Annual billing products (same tiers, different billing interval)
  "prod_Tyyp074Dme7iUa": { tier: "pro", credits: 25 },
  "prod_TyypfEhNSNWn69": { tier: "business", credits: 100 },
  "prod_Tyypa9CdcBcrjb": { tier: "scale", credits: 999 },
};

const CREDIT_PACK_MAP: Record<string, number> = {
  "prod_TyqrAktXCAAqXl": 10,
  "prod_Tyqr7S9IGVN5Aa": 25,
  "prod_TyqrLZZTTXPoMt": 50,
};

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`[STRIPE-WEBHOOK] Event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle one-time credit pack purchase
        if (session.mode === "payment" && session.metadata?.type === "credit_pack") {
          const userId = session.metadata.user_id;
          if (userId) {
            // Get the line items to determine which credit pack
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
            const productId = lineItems.data[0]?.price?.product as string;
            const creditsToAdd = CREDIT_PACK_MAP[productId] || 0;

            if (creditsToAdd > 0) {
              // Increment the user's credits_limit
              const { data: currentCredits } = await supabase
                .from("usage_credits")
                .select("credits_limit")
                .eq("user_id", userId)
                .maybeSingle();

              const newLimit = (currentCredits?.credits_limit || 5) + creditsToAdd;
              await supabase
                .from("usage_credits")
                .update({ credits_limit: newLimit })
                .eq("user_id", userId);

              console.log(`[STRIPE-WEBHOOK] User ${userId} purchased ${creditsToAdd} credits. New limit: ${newLimit}`);
            }
          }
          break;
        }

        // Handle subscription checkout
        if (session.mode === "subscription" && session.customer_email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users.users.find((u) => u.email === session.customer_email);
          if (user) {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            const productId = (sub.items.data[0].price.product as string);
            const tierInfo = TIER_MAP[productId] || { tier: "pro", credits: 25 };

            await supabase.from("profiles").update({ subscription_tier: tierInfo.tier }).eq("user_id", user.id);
            await supabase.from("usage_credits").update({ credits_limit: tierInfo.credits }).eq("user_id", user.id);
            console.log(`[STRIPE-WEBHOOK] User ${user.id} upgraded to ${tierInfo.tier}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        if (customer.email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users.users.find((u) => u.email === customer.email);
          if (user) {
            if (sub.status === "active") {
              const productId = sub.items.data[0].price.product as string;
              const tierInfo = TIER_MAP[productId] || { tier: "pro", credits: 25 };
              await supabase.from("profiles").update({ subscription_tier: tierInfo.tier }).eq("user_id", user.id);
              await supabase.from("usage_credits").update({ credits_limit: tierInfo.credits }).eq("user_id", user.id);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        if (customer.email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users.users.find((u) => u.email === customer.email);
          if (user) {
            await supabase.from("profiles").update({ subscription_tier: "free" }).eq("user_id", user.id);
            await supabase.from("usage_credits").update({ credits_limit: 5 }).eq("user_id", user.id);
            console.log(`[STRIPE-WEBHOOK] User ${user.id} downgraded to free`);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[STRIPE-WEBHOOK] Payment failed for invoice ${invoice.id}`);
        break;
      }
    }
  } catch (err) {
    console.error(`[STRIPE-WEBHOOK] Error processing ${event.type}:`, err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
