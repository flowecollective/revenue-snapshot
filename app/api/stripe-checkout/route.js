import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const BASE_URL = "https://snap.flowecollective.com";

export async function POST(req) {
  try {
    const data = await req.json();
    const { email, name, archetype, sessionId } = data;

    if (!email || !archetype) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build success URL with archetype + email baked in — survives incognito/storage wipe
    const successUrl =
      `${BASE_URL}/quiz?paid=1` +
      `&t=${encodeURIComponent(archetype)}` +
      `&e=${encodeURIComponent(email)}` +
      `&sid=${encodeURIComponent(sessionId || "")}`;

    const cancelUrl = `${BASE_URL}/quiz`;

    // Create Stripe Checkout Session via API
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("customer_email", email);
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", process.env.STRIPE_PRICE_ID);
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[archetype]", archetype);
    params.append("metadata[quiz_session_id]", sessionId || "");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return NextResponse.json({ error: session.error?.message || "Stripe error" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
