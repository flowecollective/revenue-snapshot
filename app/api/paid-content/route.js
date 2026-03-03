import { NextResponse } from "next/server";
import { checkEntitlement } from "@/lib/entitlements";
import { createServerClient } from "@/lib/supabase";
import { computeAudit, getTerms } from "@/lib/audit-engine";

/**
 * GET /api/paid-content?audit_id=...&section=lift45|scripts|scorecard|copy
 *
 * Returns paid section data ONLY if the user has purchased the Lift Plan.
 * The audit data is fetched from Supabase (never trusted from the client).
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("audit_id");
  const section = searchParams.get("section");

  if (!auditId || !section) {
    return NextResponse.json({ error: "Missing audit_id or section" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get user from auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check entitlement
  const hasAccess = await checkEntitlement(user.id, auditId, "lift_plan");
  if (!hasAccess) {
    return NextResponse.json({ error: "Purchase required", product: "lift_plan" }, { status: 403 });
  }

  // Fetch audit data from DB (server-side source of truth)
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("audit_data, industry")
    .eq("id", auditId)
    .eq("user_id", user.id)
    .single();

  if (auditError || !audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Compute with mode="paid" to include fix/result fields
  const r = computeAudit(audit.audit_data, "paid");
  const terms = getTerms(audit.audit_data.industry);

  switch (section) {
    case "lift45":
      return NextResponse.json({
        rankedGaps: r.rankedGaps,
        sortedByRPH: r.sortedByRPH,
        metrics: {
          revenuePerHourWorked: r.revenuePerHourWorked,
          utilization: r.utilization,
          rebook: r.rebook,
          lifespan: r.lifespan,
          avgTicket: r.avgTicket,
          revenueGap: r.revenueGap,
          requiredWeeklyRev: r.requiredWeeklyRev,
        },
      });

    case "scripts":
      return NextResponse.json({
        terms,
        scripts: buildScripts(r, terms),
      });

    case "scorecard":
      return NextResponse.json({
        metrics: {
          revenuePerHourWorked: r.revenuePerHourWorked,
          revenuePerHour: r.revenuePerHour,
          avgTicket: r.avgTicket,
          weeklyRev: r.weeklyRev,
          requiredWeeklyRev: r.requiredWeeklyRev,
          target: r.target,
          utilization: r.utilization,
          noShow: r.noShow,
          cancel: r.cancel,
          rebook: r.rebook,
          lifespan: r.lifespan,
          ltv: r.ltv,
          annualRev: r.annualRev,
        },
      });

    case "copy":
      return NextResponse.json({
        fullReport: buildCopyExport(r, audit.audit_data),
      });

    default:
      return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }
}

function buildScripts(r, terms) {
  const scripts = [];
  if (r.lostRate > 0.05) {
    scripts.push({
      id: "deposit",
      title: "Deposit / No-Show Policy",
      text: `"To guarantee your ${terms.appointment} time, we hold it with a [$ amount] deposit — applied directly to your ${terms.service}. This protects your slot so no one else can book it.\n\nIf something comes up, we just ask for [24/48] hours' notice so we can offer that time to someone on our waitlist. Otherwise, the deposit covers the reserved time."`,
    });
  }
  if (r.rebook < 0.7) {
    scripts.push({
      id: "rebooking",
      title: "Checkout Rebooking",
      text: `"I want to make sure we lock in your next ${terms.appointment} before the best times fill up. Based on what we did today, I'd recommend coming back in [X weeks]. I have [day] at [time] or [day] at [time] — which works better?"\n\nAlways offer exactly 2 options. Never ask "would you like to rebook?" — assume the next ${terms.appointment}.`,
    });
  }
  if (r.revenuePerHourWorked < (r.target > 0 ? r.target / r.annualHrs : 100)) {
    scripts.push({
      id: "pricing",
      title: "Pricing Reframe",
      text: `"I've updated my pricing to reflect the [training/experience/demand] for this ${terms.service}. The investment for [${terms.service} name] is now [$ new price], which includes [specific value detail].\n\nMost ${terms.client}s tell me it's the best [result] they've experienced — and I want to make sure you're getting that same level of outcome."`,
    });
  }
  scripts.push({
    id: "upsell",
    title: `${terms.service.charAt(0).toUpperCase() + terms.service.slice(1)} Upgrade`,
    text: `"Based on what I'm seeing today, I'd recommend adding [upgrade ${terms.service}] — it'll [specific benefit] and the results will last [X longer / look X better]. It's an additional [$XX] and takes about [X minutes]. Want me to add that in?"\n\nFrame the upgrade around their specific situation, not as a generic upsell.`,
  });
  return scripts;
}

function buildCopyExport(r, data) {
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const fmtPct = (n) => Math.round(n) + "%";
  return `REVENUE SNAPSHOT — ${data.businessName || "Your Business"}

CURRENT POSITION
Monthly Revenue: ${fmt(r.rev)}
Earned Revenue/Hr: ${fmt(r.revenuePerHourWorked)}/hr
Average Ticket: ${fmt(r.avgTicket)}
Capacity Utilization: ${fmtPct(Math.min(r.utilization, 100))}
Weekly Revenue: ${fmt(r.weeklyRev)}${r.target > 0 ? `\nAnnual Target: ${fmt(r.target)}` : ""}${r.revenueGap > 0 ? `\nRevenue Gap: ${fmt(r.revenueGapAnnual)}/year` : ""}

REVENUE LEAKS
No-Show Rate: ${fmtPct(r.noShow * 100)}
Late Cancel Rate: ${fmtPct(r.cancel * 100)}
Annual Schedule Leakage: ${fmt(r.lostRevAnnual)}
Unfilled Hours/Month: ${Math.round(r.unusedHours)}

CLIENT RETENTION
Rebooking Rate: ${fmtPct(r.rebook * 100)}
Client Lifespan: ${r.lifespan} months
Client LTV: ${fmt(r.ltv)}

TOP STRUCTURAL GAPS
${r.rankedGaps.map((g, i) => `${i + 1}. ${g.title} [${g.severity.toUpperCase()}] — ${fmt(g.dollarImpact)}/yr\n   ${g.summary}${g.fix ? `\n   FIX: ${g.fix}` : ""}${g.result ? `\n   RESULT: ${g.result}` : ""}`).join("\n\n")}

SERVICE YIELD
${r.sortedByRPH.map((s, i) => `${i + 1}. ${s.name || "Service"}: ${fmt(s.revenuePerHour)}/hr — ${fmt(s.priceNum)} × ${Math.round(s.bookingsNum)}/mo`).join("\n")}

Directional diagnostic. Not financial or tax advice.`;
}
