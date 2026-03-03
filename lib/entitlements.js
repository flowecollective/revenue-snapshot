import { createServerClient } from "./supabase";

/**
 * Check if a user has access to a product for a given audit.
 * Called from API routes only (uses service role key).
 *
 * @param {string} userId - Supabase auth user ID
 * @param {string} auditId - The audit ID
 * @param {string} product - "lift_plan" | "ai_engine"
 * @returns {Promise<boolean>}
 */
export async function checkEntitlement(userId, auditId, product) {
  const supabase = createServerClient();

  // Check for unlimited (platform) subscription first
  const { data: platform } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .in("product", ["unlimited_monthly", "unlimited_annual"])
    .eq("status", "active")
    .limit(1);

  if (platform && platform.length > 0) return true;

  // Check per-audit purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("audit_id", auditId)
    .eq("product", product)
    .eq("status", "active")
    .limit(1);

  return purchase && purchase.length > 0;
}

/**
 * Get all entitlements for a user + audit combo.
 * Returns { liftPlan: bool, aiEngine: bool, unlimited: bool }
 */
export async function getEntitlements(userId, auditId) {
  const supabase = createServerClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("product, audit_id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  const list = purchases || [];
  const unlimited = list.some((p) =>
    ["unlimited_monthly", "unlimited_annual"].includes(p.product)
  );

  return {
    liftPlan:
      unlimited || list.some((p) => p.product === "lift_plan" && p.audit_id === auditId),
    aiEngine:
      unlimited || list.some((p) => p.product === "ai_engine" && p.audit_id === auditId),
    unlimited,
  };
}

/**
 * Count AI generations used for a given audit.
 */
export async function countAiGenerations(userId, auditId) {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("audit_id", auditId);

  return count || 0;
}
