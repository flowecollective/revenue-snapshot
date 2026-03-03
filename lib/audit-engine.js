/**
 * THE REVENUE SNAPSHOT — Gap Analysis Engine
 *
 * This runs on BOTH client and server:
 * - Client: computes free metrics + gap #1 (no fix/result)
 * - Server: computes full ranked gaps with fix/result for paid users
 *
 * The `mode` parameter controls what's returned.
 */

const fmt = (n) => (!n || isNaN(n)) ? "$0" : "$" + Math.round(n).toLocaleString("en-US");
const fmtPct = (n) => (!n || isNaN(n)) ? "0%" : Math.round(n) + "%";
const fmtDec = (n, d = 1) => (!n || isNaN(n)) ? "0" : Number(n).toFixed(d);
const fmtNum = (n) => (!n || isNaN(n)) ? "0" : Math.round(n).toLocaleString("en-US");

const INDUSTRIES = {
  beauty: { label: "Hair / Beauty / Esthetics", terms: { client: "client", appointment: "appointment", service: "service", provider: "stylist" } },
  fitness: { label: "Personal Training / Fitness", terms: { client: "client", appointment: "session", service: "training", provider: "trainer" } },
  spa: { label: "Spa / Massage / Bodywork", terms: { client: "client", appointment: "appointment", service: "treatment", provider: "therapist" } },
  dental: { label: "Dental / Medical Aesthetic", terms: { client: "patient", appointment: "appointment", service: "procedure", provider: "provider" } },
  coaching: { label: "Coaching / Consulting", terms: { client: "client", appointment: "session", service: "engagement", provider: "coach" } },
  other: { label: "Other / Custom", terms: { client: "client", appointment: "appointment", service: "service", provider: "professional" } },
};

export function getTerms(industryId) {
  return INDUSTRIES[industryId]?.terms || INDUSTRIES.other.terms;
}

export { INDUSTRIES };

/**
 * Compute all metrics from audit data.
 * @param {object} data - The audit form data
 * @param {"free"|"paid"} mode - "free" returns gap #1 summary only, "paid" returns all gaps with fix/result
 */
export function computeAudit(data, mode = "free") {
  const rev = parseFloat(data.monthlyRevenue) || 0;
  const target = parseFloat(data.targetAnnualIncome) || 0;
  const daysWk = parseFloat(data.workingDaysPerWeek) || 5;
  const hrsDay = parseFloat(data.hoursPerDay) || 8;
  const wksYr = parseFloat(data.weeksPerYear) || 50;
  const noShow = (parseFloat(data.noShowRate) || 0) / 100;
  const cancel = (parseFloat(data.cancellationRate) || 0) / 100;
  const lifespan = parseFloat(data.avgClientLifespanMonths) || 12;
  const visitsPerYear = parseFloat(data.avgVisitsPerYear) || 12;
  const visitsPerMo = visitsPerYear / 12;
  const newClients = parseFloat(data.newClientsPerMonth) || 0;
  const rebook = (parseFloat(data.rebookingRate) || 0) / 100;

  const monthlyHrs = daysWk * hrsDay * (wksYr / 12);
  const weeklyHrs = daysWk * hrsDay;
  const annualHrs = daysWk * hrsDay * wksYr;
  const annualRev = rev * 12;
  const weeklyRev = wksYr > 0 ? rev / (wksYr / 12) : 0;
  const ninetyDayRev = rev * 3;

  const services = (data.services || []).map((s) => {
    const price = parseFloat(s.price) || 0;
    const dur = parseFloat(s.duration) || 60;
    const bookings = parseFloat(s.bookings) || 0;
    const monthlyRev = price * bookings;
    const revenuePerHour = dur > 0 ? price / (dur / 60) : 0;
    const hoursUsed = (dur / 60) * bookings;
    return { ...s, priceNum: price, durationNum: dur, bookingsNum: bookings, monthlyRev, revenuePerHour, hoursUsed };
  });

  const totalServiceRev = services.reduce((a, s) => a + s.monthlyRev, 0);
  const totalServiceHrs = services.reduce((a, s) => a + s.hoursUsed, 0);
  const totalBookings = services.reduce((a, s) => a + s.bookingsNum, 0);
  const revenuePerHour = monthlyHrs > 0 ? rev / monthlyHrs : 0;
  const revenuePerHourWorked = totalServiceHrs > 0 ? totalServiceRev / totalServiceHrs : revenuePerHour;
  const utilization = monthlyHrs > 0 ? (totalServiceHrs / monthlyHrs) * 100 : 0;
  const unusedHours = Math.max(0, monthlyHrs - totalServiceHrs);
  const avgTicket = totalBookings > 0 ? totalServiceRev / totalBookings : 0;
  const lostRate = noShow + cancel;
  const lostRevMonthly = rev * lostRate;
  const lostRevAnnual = lostRevMonthly * 12;
  const ltv = avgTicket * visitsPerMo * lifespan;
  const requiredWeeklyRev = target > 0 && wksYr > 0 ? target / wksYr : 0;
  const revenueGap = Math.max(0, requiredWeeklyRev - weeklyRev);
  const revenueGapAnnual = revenueGap * wksYr;
  const revenueAtCapacity = monthlyHrs * revenuePerHourWorked;
  const sortedByRPH = [...services].filter((s) => s.priceNum > 0).sort((a, b) => b.revenuePerHour - a.revenuePerHour);

  const terms = getTerms(data.industry);

  // ─── Gap Engine ───
  const allGaps = [];

  if (utilization < 75) {
    const iC = utilization < 50;
    allGaps.push({
      id: "capacity", title: "Unfilled Capacity",
      severity: iC ? "critical" : "moderate", impact: iC ? 95 : 70,
      dollarImpact: unusedHours * 0.4 * revenuePerHourWorked * 12,
      summary: `you're using ${fmtPct(utilization)} of available hours, leaving ${fmtDec(unusedHours, 0)} hours unfilled every month. That's ${fmt(unusedHours * revenuePerHourWorked)}/month in potential revenue sitting empty.`,
      ...(mode === "paid" ? {
        fix: `Focus on filling ${fmtDec(unusedHours * 0.4, 0)} hours/month through rebooking optimization, waitlist management, and strategic scheduling of your highest-yield ${terms.service}s in open slots.`,
        result: `Utilization rises to ${fmtPct(Math.min(utilization + 15, 90))}+. Adds ${fmt(unusedHours * 0.4 * revenuePerHourWorked)}/month without adding a single new ${terms.service}.`,
      } : {}),
    });
  }

  if (lostRate > 0.05) {
    const iC = lostRate > 0.15;
    allGaps.push({
      id: "schedule", title: "Schedule Protection",
      severity: iC ? "critical" : lostRate > 0.08 ? "moderate" : "minor", impact: iC ? 90 : 60,
      dollarImpact: lostRevAnnual,
      summary: `${fmtPct(lostRate * 100)} of your ${terms.appointment}s don't happen. That's ${fmt(lostRevMonthly)}/month walking out the door.`,
      ...(mode === "paid" ? {
        fix: `Require a $25–50 deposit at booking. Applied to the ${terms.service}, refundable with 24hr notice. Add automated reminders at 48hr and 24hr.`,
        result: `No-show rate drops to 2–3%. That's ${fmt(lostRevAnnual * 0.75)}+ recovered in year 1.`,
      } : {}),
    });
  }

  if (sortedByRPH.length >= 2) {
    const sp = sortedByRPH[0].revenuePerHour / Math.max(sortedByRPH[sortedByRPH.length - 1].revenuePerHour, 1);
    if (sp > 1.3) {
      allGaps.push({
        id: "yield", title: "Service Yield Misalignment",
        severity: sp > 2.5 ? "critical" : sp > 1.8 ? "moderate" : "minor", impact: sp > 2.5 ? 85 : 55,
        dollarImpact: (sortedByRPH[0].revenuePerHour - sortedByRPH[sortedByRPH.length - 1].revenuePerHour) * 4 * 12,
        summary: `${fmtDec(sp, 1)}x spread between ${sortedByRPH[0].name || "top"} (${fmt(sortedByRPH[0].revenuePerHour)}/hr) and ${sortedByRPH[sortedByRPH.length - 1].name || "lowest"} (${fmt(sortedByRPH[sortedByRPH.length - 1].revenuePerHour)}/hr). Low-yield ${terms.service}s are diluting your hourly rate.`,
        ...(mode === "paid" ? {
          fix: `Shift volume toward ${sortedByRPH[0].name || "your top service"}. Reprice or shorten low-yield ${terms.service}s. Consider bundling instead of discounting.`,
          result: `Average revenue per hour increases toward ${fmt(sortedByRPH[0].revenuePerHour)}/hr without adding hours.`,
        } : {}),
      });
    }
  }

  const reqRPH = annualHrs > 0 && target > 0 ? target / annualHrs : 0;
  if (avgTicket > 0 && (reqRPH > 0 ? revenuePerHourWorked < reqRPH * 0.85 : avgTicket < 100)) {
    allGaps.push({
      id: "pricing", title: "Pricing Gap",
      severity: reqRPH > 0 && revenuePerHourWorked < reqRPH * 0.6 ? "critical" : "moderate", impact: 70,
      dollarImpact: rev * 0.15 * 12,
      summary: `your earned rate of ${fmt(revenuePerHourWorked)}/hr ${reqRPH > 0 ? `is below the ${fmt(reqRPH)}/hr needed to hit your target` : "suggests pricing opportunity"}. Your time is undervalued.`,
      ...(mode === "paid" ? {
        fix: `Implement a 10–15% price adjustment on your core ${terms.service}s. Frame around value delivered, not cost. Use the pricing script in your Lift Plan.`,
        result: `A 15% adjustment adds ${fmt(rev * 0.15)}/month — that's ${fmt(rev * 0.15 * 12)}/year with zero additional hours.`,
      } : {}),
    });
  }

  if (lifespan < 18 || rebook < 0.65) {
    const ltvGain = avgTicket * visitsPerMo * 6;
    allGaps.push({
      id: "retention", title: "Rebooking & Retention",
      severity: lifespan < 8 || rebook < 0.4 ? "critical" : "moderate", impact: 65,
      dollarImpact: ltvGain * newClients * 12,
      summary: `only ${fmtPct(rebook * 100)} of ${terms.client}s book their next ${terms.appointment} before leaving. Every ${terms.client} who doesn't rebook = ${fmt(ltvGain)} in lifetime value at risk.`,
      ...(mode === "paid" ? {
        fix: `Implement checkout rebooking: always offer exactly 2 time slots before the ${terms.client} leaves. Never ask "would you like to rebook?" — assume the next ${terms.appointment}.`,
        result: `Rebooking rate rises to 75%+. Extending each ${terms.client} relationship by 6 months adds ${fmt(ltvGain)} per ${terms.client}.`,
      } : {}),
    });
  }

  if (target > 0 && revenueGap > 0) {
    const gs = revenueGapAnnual / target;
    allGaps.push({
      id: "target", title: "Target Revenue Gap",
      severity: gs > 0.3 ? "critical" : gs > 0.1 ? "moderate" : "minor", impact: gs > 0.3 ? 88 : 55,
      dollarImpact: revenueGapAnnual,
      summary: `you're ${fmt(revenueGap)}/week below your stated target. At current pace, that's a ${fmt(revenueGapAnnual)} annual shortfall.`,
      ...(mode === "paid" ? {
        fix: `Close this through the combination of fixes above — schedule protection, rebooking, and pricing adjustments compound together.`,
        result: `Addressing the top 2 gaps typically closes 60–80% of target gaps within 90 days.`,
      } : {}),
    });
  }

  const rankedGaps = allGaps.sort((a, b) => b.impact - a.impact).slice(0, 3);

  // Health score
  const clampedUtil = Math.min(utilization, 100);
  let score = 55;
  if (clampedUtil >= 80) score += 12; else if (clampedUtil >= 65) score += 5; else score -= 6;
  if (lostRate <= 0.05) score += 8; else if (lostRate <= 0.12) score += 2; else score -= 6;
  if (revenuePerHour >= 150) score += 10; else if (revenuePerHour >= 80) score += 4; else score -= 4;
  if (lifespan >= 18) score += 8; else if (lifespan >= 8) score += 2; else score -= 4;
  if (rebook >= 0.7) score += 7; else if (rebook >= 0.4) score += 2; else score -= 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    rev, annualRev, weeklyRev, ninetyDayRev, target,
    revenuePerHour, revenuePerHourWorked, utilization, unusedHours,
    avgTicket, monthlyHrs, weeklyHrs, annualHrs,
    totalServiceHrs, totalBookings, noShow, cancel,
    lostRate, lostRevMonthly, lostRevAnnual,
    ltv, lifespan, visitsPerMo, visitsPerYear, newClients, rebook,
    requiredWeeklyRev, revenueGap, revenueGapAnnual, revenueAtCapacity,
    services, sortedByRPH, totalServiceRev,
    rankedGaps, score, daysWk, hrsDay, wksYr, terms,
  };
}
