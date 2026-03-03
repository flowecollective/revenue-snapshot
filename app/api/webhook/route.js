import { NextResponse } from "next/server";
import { stripe, PRODUCT_FROM_PRICE } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";

// Disable body parsing — Stripe needs the raw body to verify signature
export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email;
      const metadata = session.metadata || {};
      const auditId = metadata.audit_id || null;
      const userId = metadata.user_id;

      if (!userId) {
        console.error("No user_id in session metadata");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Get the line items to determine what was purchased
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const product = PRODUCT_FROM_PRICE[priceId];

      if (!product) {
        console.error("Unknown price ID:", priceId);
        return NextResponse.json({ error: "Unknown product" }, { status: 400 });
      }

      // Write the purchase
      const { error } = await supabase.from("purchases").insert({
        user_id: userId,
        audit_id: auditId,
        product,
        stripe_session_id: session.id,
        stripe_customer_id: session.customer,
        status: "active",
        // For subscriptions, set expires_at
        expires_at: ["unlimited_monthly", "unlimited_annual"].includes(product)
          ? new Date(Date.now() + (product === "unlimited_annual" ? 365 : 30) * 86400000).toISOString()
          : null,
      });

      if (error) {
        console.error("Failed to write purchase:", error);
        return NextResponse.json({ error: "DB write failed" }, { status: 500 });
      }

      console.log(`Purchase recorded: ${product} for user ${userId}, audit ${auditId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // Mark subscription purchases as cancelled
      const { error } = await supabase
        .from("purchases")
        .update({ status: "cancelled" })
        .eq("stripe_customer_id", subscription.customer)
        .in("product", ["unlimited_monthly", "unlimited_annual"]);

      if (error) console.error("Failed to cancel subscription:", error);
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true });
}
