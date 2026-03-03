import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Map product names to Stripe price IDs
export const PRICE_MAP = {
  lift_plan: process.env.STRIPE_PRICE_LIFT_PLAN,
  ai_engine: process.env.STRIPE_PRICE_AI_ENGINE,
  unlimited_monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
  unlimited_annual: process.env.STRIPE_PRICE_UNLIMITED_ANNUAL,
};

// Reverse map: price ID → product name
export const PRODUCT_FROM_PRICE = Object.fromEntries(
  Object.entries(PRICE_MAP).map(([k, v]) => [v, k])
);
