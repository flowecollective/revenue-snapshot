import { NextResponse } from "next/server";
import { checkEntitlement, countAiGenerations } from "@/lib/entitlements";
import { createServerClient } from "@/lib/supabase";
import { computeAudit } from "@/lib/audit-engine";

const MAX_GENERATIONS_PER_AUDIT = 3;

export async function POST(req) {
  try {
    const { auditId } = await req.json();

    if (!auditId) {
      return NextResponse.json({ error: "Missing auditId" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Authenticate
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check AI entitlement
    const hasAccess = await checkEntitlement(user.id, auditId, "ai_engine");
    if (!hasAccess) {
      return NextResponse.json({ error: "Purchase required", product: "ai_engine" }, { status: 403 });
    }

    // Check generation count (unlimited users get 9999)
    const { data: unlimitedCheck } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .in("product", ["unlimited_monthly", "unlimited_annual"])
      .eq("status", "active")
      .limit(1);

    const isUnlimited = unlimitedCheck && unlimitedCheck.length > 0;
    const genCount = await countAiGenerations(user.id, auditId);

    if (!isUnlimited && genCount >= MAX_GENERATIONS_PER_AUDIT) {
      return NextResponse.json({
        error: "Generation limit reached",
        used: genCount,
        max: MAX_GENERATIONS_PER_AUDIT,
      }, { status: 429 });
    }

    // Fetch audit data
    const { data: audit } = await supabase
      .from("audits")
      .select("audit_data")
      .eq("id", auditId)
      .eq("user_id", user.id)
      .single();

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Compute metrics
    const r = computeAudit(audit.audit_data, "paid");

    // Build the Claude prompt
    const systemPrompt = `You are a Revenue Execution Specialist. Generate a 45-day tactical action plan based on the audit data provided. Structure your response as:

PHASE 1: DAYS 1-15 (Foundation)
- 3-4 specific actions with deadlines

PHASE 2: DAYS 16-30 (Acceleration)  
- 3-4 specific actions building on Phase 1

PHASE 3: DAYS 31-45 (Optimization)
- 3-4 specific actions for compounding results

KPI TARGETS
- Week 1/2/3/4/5/6 targets for the primary metric

PROJECTED IMPACT
- Conservative and optimistic revenue impact estimates

Be specific, actionable, and reference the actual numbers from their audit. No fluff.`;

    const userPrompt = `Audit data for ${audit.audit_data.businessName || "this business"}:
- Industry: ${audit.audit_data.industry || "service business"}
- Monthly revenue: $${r.rev}
- Revenue per hour: $${r.revenuePerHourWorked}/hr
- Utilization: ${Math.round(r.utilization)}%
- Unused hours/month: ${Math.round(r.unusedHours)}
- No-show rate: ${Math.round(r.noShow * 100)}%
- Rebooking rate: ${Math.round(r.rebook * 100)}%
- Average ticket: $${r.avgTicket}
- Top 3 gaps: ${r.rankedGaps.map((g, i) => `${i + 1}. ${g.title} ($${Math.round(g.dollarImpact)}/yr)`).join(", ")}
- Top service by RPH: ${r.sortedByRPH[0]?.name || "N/A"} at $${Math.round(r.sortedByRPH[0]?.revenuePerHour || 0)}/hr

Generate the 45-day execution plan.`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", errText);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const result = await response.json();
    const generatedText = result.content?.[0]?.text || "Generation failed.";

    // Record the generation
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      audit_id: auditId,
      prompt_summary: `45-day plan for ${audit.audit_data.businessName || "audit"}`,
      result_text: generatedText,
    });

    return NextResponse.json({
      text: generatedText,
      used: genCount + 1,
      max: isUnlimited ? null : MAX_GENERATIONS_PER_AUDIT,
    });
  } catch (err) {
    console.error("AI engine error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
