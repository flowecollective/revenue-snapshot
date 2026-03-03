import { NextResponse } from "next/server";
import { stripe, PRICE_MAP } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { product, auditId, userEmail, userId } = await req.json();

    if (!product || !userId) {
      return NextResponse.json({ error: "Missing product or userId" }, { status: 400 });
    }

    const priceId = PRICE_MAP[product];
    if (!priceId) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    const isSubscription = ["unlimited_monthly", "unlimited_annual"].includes(product);

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: userId,
        audit_id: auditId || "",
        product,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/snapshot?audit=${auditId}&purchased=${product}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/snapshot?audit=${auditId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
