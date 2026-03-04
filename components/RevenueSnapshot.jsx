"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tsdyedahxmiaaxnewfoz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZHllZGFoeG1pYWF4bmV3Zm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTUyNjksImV4cCI6MjA4NzYzMTI2OX0.R5S-Bmi8UUPDlz7KUcuA6Cj6LIZMKTqo1O-r_CrfrVA";
const supabase = typeof window !== "undefined"
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ═══════════════════════════════════════════
   THE REVENUE SNAPSHOT™
   Free: The Revenue Snapshot
   Paid: The Lift Plan ($147)
   Add-on: AI Execution Engine ($27)
   Platform: Unlimited Mode ($67/mo · $597/yr)
   ═══════════════════════════════════════════ */

// ─── Design Tokens ───
const C = {
  cream: "#FAF6F0", ink: "#1A1A1A", charcoal: "#2C2C2C",
  ash: "#6B6460", taupe: "#6B6460", line: "#E0DAD0",
  accent: "#C9A96E", cardBg: "#FFFFFF",
  gold: "#C9A96E", goldLight: "#E8D5B0", goldDark: "#A8884D",
  critical: "#9E3B33", criticalBg: "#9E3B3312",
};
const font = { display: "'Cormorant Garamond', Georgia, serif", body: "'Outfit', sans-serif" };

// ─── Storage Helper (in-memory for artifact sandbox) ───
const _mem = {};
const store = {
  get: (k) => { try { return k in _mem ? _mem[k] : null; } catch { return null; } },
  set: (k, v) => { try { _mem[k] = v; } catch {} },
};

// ─── Stripe Payment Links (REPLACE WITH YOUR URLS) ───
const STRIPE = {
  blueprint: "https://buy.stripe.com/00w7sKbeg84ZbacdY69EI00",
  aiAddon: "https://buy.stripe.com/fZu7sKgyA3OJ1zC3js9EI03",
  platformMonthly: "https://buy.stripe.com/eVqcN4eqsclf924cU29EI02",
  platformAnnual: "https://buy.stripe.com/8x24gy2HKfxrfqs4nw9EI01",
};

// ─── Entitlement Helpers ───
const KEYS = {
  blueprint: (aid) => `unlock_blueprint_${aid}`,
  ai: (aid) => `unlock_ai_${aid}`,
  platform: "unlock_platform_plan",
};
const getPlatform = () => store.get(KEYS.platform) || "none";
const isPlatform = () => getPlatform() !== "none";
const hasBlueprint = (aid) => isPlatform() || !!store.get(KEYS.blueprint(aid));
const hasAI = (aid) => isPlatform() || !!store.get(KEYS.ai(aid));
const maxAiGens = (aid) => isPlatform() ? 9999 : hasAI(aid) ? 3 : 0;

// ─── Offer Catalog ───
const OFFERS = {
  blueprint: {
    name: "The Lift Plan (This Audit)", priceLabel: "$147 one-time (per audit)", badge: "MOST POPULAR",
    hype: "Unlock the exact levers to recover revenue fast — with a 45-day action system.",
    includes: ["Ranked Structural Gaps (Top 3) w/ severity + $ impact", "Primary Lever Card (the #1 move for the next 45 days)", "45-Day Revenue Lift System (phase-based plan)", "90-Day Architecture Plan (3 pillars, prioritized)", "KPI Dashboard (weekly targets + tracking)", "Copy/Export Summary (one-click copy/paste)"],
    CTA: "Unlock Lift Plan — $147 →", stripeKey: "blueprint",
  },
  aiAddOn: {
    name: "AI Execution Engine (This Audit)", priceLabel: "+$27 (per audit)", badge: "FASTEST EXECUTION",
    hype: "Turn your audit into a step-by-step implementation plan in seconds.",
    includes: ["AI Execution Console for this audit", "3 generations per audit (structured outputs)", "Scripts: deposits, rebooking, consult framing", "Checklists + KPI targets for 15/30/45 days"],
    CTA: "Add AI — $27 →", stripeKey: "aiAddon",
  },
  platform: {
    name: "Unlimited Mode", badge: "POWER USERS",
    hype: "Unlimited audits + unlimited AI + executive tracking.",
    monthly: { priceLabel: "$67/month", stripeKey: "platformMonthly", CTA: "Start Unlimited — $67/mo →" },
    annual: { priceLabel: "$597/year", stripeKey: "platformAnnual", CTA: "Start Unlimited — $597/yr →", save: "2 months free" },
    includes: ["Unlimited audits (run scenarios any time)", "Unlimited AI implementation (no generation caps)", "Executive dashboard (track lift over time)", "Scenario modeling (pricing, capacity, retention)", "Quarterly recalibration prompts"],
  },
};

// ─── Formatters ───
const fmt = (n) => (!n || isNaN(n)) ? "$0" : "$" + Math.round(n).toLocaleString("en-US");
const fmtPct = (n) => (!n || isNaN(n)) ? "0%" : Math.round(n) + "%";
const fmtNum = (n) => (!n || isNaN(n)) ? "0" : Math.round(n).toLocaleString("en-US");
const fmtDec = (n, d = 1) => (!n || isNaN(n)) ? "0" : Number(n).toFixed(d);
const fmtDuration = (m) => { if (!m) return "0 min"; const h = Math.floor(m/60), mn = m%60; return h && mn ? `${h}hr ${mn}m` : h ? `${h}hr` : `${mn}m`; };

// ─── Industry Templates ───
const INDUSTRIES = {
  beauty: {
    label: "Hair / Beauty / Esthetics",
    terms: { client: "client", appointment: "appointment", service: "service", provider: "stylist" },
    services: [
      { name: "Haircut & Style", price: "75", duration: "60", bookings: "40" },
      { name: "Color Service", price: "150", duration: "120", bookings: "20" },
      { name: "Blowout", price: "45", duration: "30", bookings: "25" },
      { name: "Treatment / Add-On", price: "35", duration: "20", bookings: "15" },
    ],
  },
  fitness: {
    label: "Personal Training / Fitness",
    terms: { client: "client", appointment: "session", service: "training", provider: "trainer" },
    services: [
      { name: "1-on-1 Training", price: "100", duration: "60", bookings: "50" },
      { name: "Partner Session", price: "140", duration: "60", bookings: "12" },
      { name: "Assessment / Consult", price: "75", duration: "45", bookings: "8" },
    ],
  },
  spa: {
    label: "Spa / Massage / Bodywork",
    terms: { client: "client", appointment: "appointment", service: "treatment", provider: "therapist" },
    services: [
      { name: "60-Min Massage", price: "120", duration: "60", bookings: "35" },
      { name: "90-Min Massage", price: "170", duration: "90", bookings: "15" },
      { name: "Facial", price: "110", duration: "60", bookings: "20" },
    ],
  },
  dental: {
    label: "Dental / Medical Aesthetic",
    terms: { client: "patient", appointment: "appointment", service: "procedure", provider: "provider" },
    services: [
      { name: "Cleaning / Hygiene", price: "200", duration: "60", bookings: "40" },
      { name: "Whitening", price: "450", duration: "90", bookings: "8" },
      { name: "Consultation", price: "100", duration: "30", bookings: "15" },
    ],
  },
  coaching: {
    label: "Coaching / Consulting",
    terms: { client: "client", appointment: "session", service: "engagement", provider: "coach" },
    services: [
      { name: "Strategy Session", price: "250", duration: "60", bookings: "20" },
      { name: "Group Coaching", price: "150", duration: "90", bookings: "8" },
      { name: "VIP Day", price: "1500", duration: "480", bookings: "2" },
    ],
  },
  other: {
    label: "Other / Custom",
    terms: { client: "client", appointment: "appointment", service: "service", provider: "professional" },
    services: [],
  },
};
const getTerms = (id) => INDUSTRIES[id]?.terms || INDUSTRIES.other.terms;

// ─── Severity Config ───
const SEV = {
  critical: { label: "Critical", color: C.critical, bg: C.criticalBg, border: "#9E3B3325" },
  moderate: { label: "Moderate", color: C.taupe, bg: C.taupe+"12", border: C.taupe+"25" },
  minor: { label: "Minor", color: C.ash, bg: C.ash+"12", border: C.ash+"25" },
};

// ═══════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════

function Card({ children, style={}, gold=false }) {
  return <div style={{ background: C.cardBg, borderRadius: 2, padding: "24px 22px", border: gold ? `1px solid ${C.gold}30` : `1px solid ${C.line}`, ...style }}>{children}</div>;
}

function MetricCard({ label, value, sub, gold=false, large=false, hero=false }) {
  return (
    <Card gold={gold} style={{ textAlign: (large || hero) ? "center" : "left" }}>
      <div style={{ fontSize: hero ? 10 : 9, fontWeight: 500, letterSpacing: hero ? 3 : 3, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: hero ? 14 : large ? 16 : 10 }}>{label}</div>
      <div style={{ fontSize: hero ? 60 : large ? 36 : 26, fontWeight: 300, fontFamily: font.display, color: gold ? C.goldDark : C.ink, lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: hero ? 13 : 12, color: C.ash, fontFamily: font.body, marginTop: hero ? 16 : large ? 14 : 8, lineHeight: 1.6, fontWeight: 300 }}>{sub}</div>}
    </Card>
  );
}

function Divider() { return <div style={{ height: 1, background: C.gold, margin: "56px 0", width: 60, opacity: 0.5 }} />; }
function SectionLabel({ text }) { return <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: 12 }}>{text}</div>; }
function SectionHeading({ text, sub }) {
  return <div style={{ marginBottom: 40 }}>
    {text && <h2 style={{ fontSize: 32, fontWeight: 300, color: C.ink, fontFamily: font.display, margin: 0, lineHeight: 1.15 }}>{text}</h2>}
    {sub && <p style={{ fontSize: 13, color: C.ash, fontFamily: font.body, margin: "14px 0 0", lineHeight: 1.7, fontWeight: 300 }}>{sub}</p>}
  </div>;
}
function HintBox({ children, style={} }) { return <div style={{ background: "#F0EBE2", border: `1px solid ${C.line}`, borderRadius: 2, padding: "14px 16px", marginBottom: 20, ...style }}><div style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, lineHeight: 1.6 }}>{children}</div></div>; }
function NoteBox({ icon="", children }) { return <div style={{ background: "#F0EBE2", border: `1px solid ${C.line}`, borderRadius: 2, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start", margin: "16px 0" }}><div style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.6 }}>{children}</div></div>; }

function PrimaryButton({ children, onClick, disabled=false, style={}, ariaLabel }) {
  return <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "#E8D5B0"; e.currentTarget.style.boxShadow = "0 10px 40px rgba(201,169,110,0.25)"; } }}
    onMouseLeave={e => { e.currentTarget.style.background = disabled ? "#E0DAD0" : "#C9A96E"; e.currentTarget.style.boxShadow = "none"; }}
    style={{ background: disabled ? "#E0DAD0" : C.gold, color: C.ink, border: "none", borderRadius: 2, padding: "16px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: font.body, fontWeight: 500, cursor: disabled ? "default" : "pointer", transition: "all 0.3s ease", opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>;
}
function SecondaryButton({ children, onClick, disabled=false, style={}, ariaLabel }) {
  return <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream; } }}
    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "#E0DAD0" : C.ink; }}
    style={{ background: "transparent", color: disabled ? "#E0DAD0" : C.ink, border: `1px solid ${disabled ? C.line : C.ink}`, borderRadius: 2, padding: "15px 28px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontFamily: font.body, fontWeight: 500, cursor: disabled ? "default" : "pointer", transition: "all 0.3s ease", opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>;
}

function InputField({ label, hint, value, onChange, prefix, suffix, type="number", placeholder, ariaLabel }) {
  const [focused, setFocused] = useState(false);
  const isMoney = type === "number" && prefix === "$";
  const display = isMoney && value && !focused ? Number(value).toLocaleString("en-US") : value;
  const iType = isMoney && !focused ? "text" : type;
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 4, fontFamily: font.body }}>{label}</label>
      {hint && <div style={{ fontSize: 11, color: C.taupe, marginBottom: 8, fontFamily: font.body, lineHeight: 1.5 }}>{hint}</div>}
      <div style={{ display: "flex", alignItems: "center", background: C.cardBg, border: `1px solid ${focused ? C.gold : C.line}`, borderRadius: 2, overflow: "hidden", transition: "border-color 0.2s" }}>
        {prefix && <span style={{ padding: "0 0 0 14px", color: C.ash, fontSize: 14, fontFamily: font.body }}>{prefix}</span>}
        <input type={iType} value={display} onChange={(e) => { onChange(e.target.value.replace(/,/g, "")); }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder||"0"} aria-label={ariaLabel||label}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "13px 14px", color: C.ink, fontSize: 14, fontFamily: font.body, fontWeight: 500, minWidth: 0 }} />
        {suffix && <span style={{ padding: "0 14px 0 0", color: C.ash, fontSize: 12, fontFamily: font.body, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function GapCard({ gap, rank }) {
  const s = SEV[gap.severity] || SEV.minor;
  return (
    <Card style={{ padding: "24px", marginBottom: 16, border: `1px solid ${s.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.ink, fontFamily: font.body, width: 26, height: 26, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{rank}</span>
        <span style={{ fontSize: 16, fontWeight: 400, color: C.ink, fontFamily: font.display, flex: 1 }}>{gap.title}</span>
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: s.color, background: s.bg, padding: "4px 10px", borderRadius: 2, fontFamily: font.body }}>{s.label}</span>
      </div>
      <p style={{ fontSize: 13, color: C.ash, fontFamily: font.body, lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{gap.summary}</p>
      {gap.dollarImpact > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: C.gold, fontFamily: font.body }}>Est. Annual Impact</span>
          <span style={{ fontSize: 15, fontWeight: 400, color: gap.severity === "critical" ? s.color : C.goldDark, fontFamily: font.display }}>{fmt(gap.dollarImpact)}</span>
        </div>
      )}
    </Card>
  );
}

// ─── Blurred Lock Overlay ───
function LockedSection({ title, lockType="blueprint", onUnlock, email="" }) {
  const msgs = {
    blueprint: { badge: "Unlock The Lift Plan", desc: "Get the full gap breakdown, 45-day action system, client scripts, weekly scorecard, and exportable summary.", cta: "Unlock Lift Plan — $147 →", stripe: STRIPE.blueprint },
    ai: { badge: "Add AI Execution Engine", desc: "Generate a step-by-step execution plan (scripts, checklists, KPI targets). Includes 3 runs for this audit.", cta: "Add AI Engine — $27 →", stripe: STRIPE.aiAddon },
    platform: { badge: "Unlimited Mode", desc: "Unlimited audits + unlimited AI + executive tracking and scenario modeling.", cta: "See Unlimited Plans →", stripe: null },
  };
  const m = msgs[lockType] || msgs.blueprint;
  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
      <div style={{ filter: "blur(6px)", opacity: 0.4, pointerEvents: "none", userSelect: "none" }}>
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 20, color: C.ink, fontFamily: font.display, fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.taupe, fontFamily: font.body, marginTop: 8 }}>Detailed analysis with severity levels, dollar impact estimates, and strategic recommendations.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
            <Card style={{ padding: 16 }}><div style={{ height: 12, background: C.line, borderRadius: 4, marginBottom: 8 }}/><div style={{ height: 8, background: C.line, borderRadius: 4, width: "60%" }}/></Card>
            <Card style={{ padding: 16 }}><div style={{ height: 12, background: C.line, borderRadius: 4, marginBottom: 8 }}/><div style={{ height: 8, background: C.line, borderRadius: 4, width: "75%" }}/></Card>
          </div>
        </Card>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.cardBg, borderRadius: 2, padding: "28px 32px", textAlign: "center", boxShadow: "0 8px 32px rgba(26,26,26,0.12)", maxWidth: 360 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: 10 }}>{m.badge}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: C.ink, fontFamily: font.display, marginBottom: 6 }}>{title}</div>
          <p style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, lineHeight: 1.6, margin: "0 0 18px" }}>{m.desc}</p>
          {m.stripe ? (
            <a href={`${m.stripe}?prefilled_email=${encodeURIComponent(email)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
              <PrimaryButton style={{ width: "100%" }}>{m.cta}</PrimaryButton>
            </a>
          ) : (
            <PrimaryButton onClick={onUnlock} style={{ width: "100%" }}>{m.cta}</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Service Input ───
function ServiceInput({ service, index, onChange, onRemove, canRemove }) {
  const [f, setF] = useState(null);
  const is = () => ({ flex: 1, background: "transparent", border: "none", outline: "none", padding: "11px 12px", color: C.ink, fontSize: 13, fontFamily: font.body, fontWeight: 500, minWidth: 0 });
  const ws = (n) => ({ display: "flex", alignItems: "center", background: C.cardBg, border: `1px solid ${f === n ? C.ash : C.line}`, borderRadius: 4, overflow: "hidden", transition: "border-color 0.2s" });
  const dH = Math.floor((parseFloat(service.duration)||0)/60), dM = (parseFloat(service.duration)||0)%60;
  return (
    <Card style={{ padding: "18px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.taupe, fontFamily: font.body, textTransform: "uppercase" }}>Service {index+1}</span>
        {canRemove && <button onClick={onRemove} aria-label={`Remove service ${index+1}`} style={{ background: "none", border: "none", color: C.ash, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}>×</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={ws("n")}><input type="text" placeholder="Service name" value={service.name} aria-label={`Service ${index+1} name`} onChange={e => onChange({...service, name: e.target.value})} onFocus={() => setF("n")} onBlur={() => setF(null)} style={is()} /></div>
        <div style={ws("p")}><span style={{ paddingLeft: 12, color: C.ash, fontSize: 13 }}>$</span><input type="number" placeholder="Price" value={service.price} aria-label={`Service ${index+1} price`} onChange={e => onChange({...service, price: e.target.value})} onFocus={() => setF("p")} onBlur={() => setF(null)} style={is()} /></div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <div style={ws("dh")}><input type="number" placeholder="0" value={dH||""} min="0" max="12" aria-label={`Service ${index+1} hours`} onChange={e => { const h=parseInt(e.target.value)||0; onChange({...service, duration: String(h*60+dM)}); }} onFocus={() => setF("dh")} onBlur={() => setF(null)} style={is()} /><span style={{ paddingRight: 10, color: C.ash, fontSize: 11, fontFamily: font.body }}>hr</span></div>
        <div style={ws("dm")}><input type="number" placeholder="0" value={dM||""} min="0" max="59" step="5" aria-label={`Service ${index+1} minutes`} onChange={e => { const m=parseInt(e.target.value)||0; onChange({...service, duration: String(dH*60+m)}); }} onFocus={() => setF("dm")} onBlur={() => setF(null)} style={is()} /><span style={{ paddingRight: 10, color: C.ash, fontSize: 11, fontFamily: font.body }}>min</span></div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={ws("b")}><input type="number" placeholder="Monthly bookings" value={service.bookings} aria-label={`Service ${index+1} bookings`} onChange={e => onChange({...service, bookings: e.target.value})} onFocus={() => setF("b")} onBlur={() => setF(null)} style={is()} /><span style={{ paddingRight: 12, color: C.ash, fontSize: 11, fontFamily: font.body }}>/mo</span></div>
      </div>
    </Card>
  );
}

// ─── Pricing Modal ───
function PricingModal({ onClose, email, auditId }) {
  const stripeUrl = (key) => `${STRIPE[key]}?prefilled_email=${encodeURIComponent(email)}`;
  const alreadyBlueprint = hasBlueprint(auditId);
  const alreadyAI = hasAI(auditId);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 18 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.cream, borderRadius: 2, padding: "30px 26px", width: "100%", maxWidth: 760, boxShadow: "0 18px 60px rgba(26,26,26,0.25)", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: C.ash, fontSize: 22, cursor: "pointer" }} aria-label="Close">×</button>

        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: 10 }}>Unlock Your Lift Plan</div>
          <h2 style={{ fontSize: 32, fontWeight: 300, color: C.ink, fontFamily: font.display, margin: 0, lineHeight: 1.1 }}>Choose your speed.</h2>
          <p style={{ fontSize: 13, color: C.taupe, fontFamily: font.body, margin: "8px auto 0", maxWidth: 560, lineHeight: 1.6 }}>Free shows the numbers. <strong>$147 unlocks the plan + scripts + scorecard for this audit.</strong> Add AI to generate your step-by-step execution plan in seconds.</p>
          <p style={{ fontSize: 11, color: C.ash, fontFamily: font.body, margin: "10px auto 0" }}>Lift Plan + AI apply to this audit only. Unlimited Mode unlocks everything.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {/* Lift Plan */}
          <Card gold style={{ padding: 18, border: `1px solid ${C.taupe}35` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body }}>{OFFERS.blueprint.badge}</div>
              <div style={{ fontSize: 12, color: C.ash, fontFamily: font.body }}>{OFFERS.blueprint.priceLabel}</div>
            </div>
            <div style={{ fontSize: 20, fontFamily: font.display, color: C.ink, marginTop: 10 }}>{OFFERS.blueprint.name}</div>
            <div style={{ fontSize: 12, color: C.ink, fontFamily: font.body, marginTop: 8, lineHeight: 1.6 }}>
              <strong>{OFFERS.blueprint.hype}</strong>
              <div style={{ marginTop: 6, color: C.taupe }}>Unlocks: Gaps + 45-Day Lift + Scripts + Scorecard + Export.</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {OFFERS.blueprint.includes.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0" }}>
                  <span style={{ color: C.taupe, fontSize: 12, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            {alreadyBlueprint ? (
              <PrimaryButton disabled style={{ width: "100%", marginTop: 14, background: C.line }}>Lift Plan Unlocked ✓</PrimaryButton>
            ) : (
              <a href={stripeUrl(OFFERS.blueprint.stripeKey)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginTop: 14 }}>
                <PrimaryButton style={{ width: "100%" }}>{OFFERS.blueprint.CTA}</PrimaryButton>
              </a>
            )}
            <div style={{ fontSize: 10, color: C.ash, fontFamily: font.body, marginTop: 10, textAlign: "center" }}>One-time unlock. No subscription required.</div>
          </Card>

          {/* AI Add-On */}
          <Card style={{ padding: 18, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.ash, fontFamily: font.body }}>{OFFERS.aiAddOn.badge}</div>
              <div style={{ fontSize: 12, color: C.ash, fontFamily: font.body }}>{OFFERS.aiAddOn.priceLabel}</div>
            </div>
            <div style={{ fontSize: 20, fontFamily: font.display, color: C.ink, marginTop: 10 }}>{OFFERS.aiAddOn.name}</div>
            <div style={{ fontSize: 12, color: C.ink, fontFamily: font.body, marginTop: 8, lineHeight: 1.6 }}>
              <strong>{OFFERS.aiAddOn.hype}</strong>
              <div style={{ marginTop: 6, color: C.taupe }}>Best paired with Lift Plan for "do this next" outputs.</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {OFFERS.aiAddOn.includes.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0" }}>
                  <span style={{ color: C.taupe, fontSize: 12, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            {alreadyAI ? (
              <SecondaryButton disabled style={{ width: "100%", marginTop: 14 }}>AI Added ✓</SecondaryButton>
            ) : (
              <a href={stripeUrl(OFFERS.aiAddOn.stripeKey)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginTop: 14 }}>
                <SecondaryButton style={{ width: "100%" }}>{OFFERS.aiAddOn.CTA}</SecondaryButton>
              </a>
            )}
            <div style={{ fontSize: 10, color: C.ash, fontFamily: font.body, marginTop: 10, textAlign: "center" }}>3 generations per audit.</div>
          </Card>
        </div>

        {/* Platform upsell */}
        <div style={{ marginTop: 14 }}>
          <Card style={{ padding: 18, border: `1px solid ${C.taupe}25` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body }}>{OFFERS.platform.badge}</div>
                <div style={{ fontSize: 18, fontFamily: font.display, color: C.ink, marginTop: 6 }}>{OFFERS.platform.name}</div>
                <div style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, marginTop: 6, lineHeight: 1.6 }}>{OFFERS.platform.hype}</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={stripeUrl(OFFERS.platform.monthly.stripeKey)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <PrimaryButton style={{ padding: "12px 16px" }}>{OFFERS.platform.monthly.priceLabel}</PrimaryButton>
                </a>
                <a href={stripeUrl(OFFERS.platform.annual.stripeKey)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <SecondaryButton style={{ padding: "12px 16px" }}>{OFFERS.platform.annual.priceLabel} · {OFFERS.platform.annual.save}</SecondaryButton>
                </a>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {OFFERS.platform.includes.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: C.taupe, fontSize: 12, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.ash, fontFamily: font.body, marginTop: 12 }}>Unlimited Mode includes Lift Plan + AI automatically (no per-audit limits).</div>
          </Card>
        </div>

        <div style={{ fontSize: 10, color: C.ash, fontFamily: font.body, textAlign: "center", marginTop: 12 }}>Secure checkout via Stripe. Platform plans cancel anytime.</div>
      </div>
    </div>
  );
}

// ─── AI Implementation Engine ───
function AIEngine({ auditData, r, auditId, email, onShowPricing }) {
  const maxGens = maxAiGens(auditId);
  const storageKey = `ai-gens-${auditId}`;
  const [generations, setGenerations] = useState([]);
  const [remaining, setRemaining] = useState(maxGens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = store.get(storageKey);
    if (saved) { setGenerations(saved.generations || []); setRemaining(saved.remaining ?? maxGens); }
  }, [auditId]);

  const saveGens = (gens, rem) => { store.set(storageKey, { generations: gens, remaining: rem }); };

  const generate = async () => {
    if (remaining <= 0) return;
    setLoading(true); setError(null);
    try {
      const topGap = r.rankedGaps[0];
      const systemPrompt = `You are a Revenue Execution Specialist.

Based on this audit, generate a 45-day tactical action plan designed to increase revenue by 10–20% within 45 days if executed consistently.

Provide:
- Phase-based action steps (Phase 1: Days 1–15, Phase 2: Days 16–30, Phase 3: Days 31–45)
- Weekly KPI targets
- Revenue lift projections with specific dollar estimates tied to this business's numbers
- Script suggestions where relevant (rebooking conversations, pricing adjustments, cancellation policies, consultation framing)

Keep tone practical and execution-focused.
No motivational content. No abstract strategy.
All recommendations must tie directly to the audit data provided.

The primary structural gap to address first is: "${topGap?.title || "Primary Gap"}" (${topGap?.severity || "N/A"} severity, estimated ${fmt(topGap?.dollarImpact || 0)}/year impact).

Format output as:

PHASE 1: FOUNDATION (Days 1–15)
[Title]
Actions:
Weekly KPI Targets:
Scripts (if applicable):

PHASE 2: EXECUTION (Days 16–30)
[Title]
Actions:
Weekly KPI Targets:

PHASE 3: OPTIMIZATION (Days 31–45)
[Title]
Actions:
Weekly KPI Targets:

KPI TRACKING TABLE:
[metric] | [current] | [45-day target]

REVENUE IMPACT PROJECTION:
[15-day estimate] | [30-day estimate] | [45-day estimate]`;

      const userPrompt = `REVENUE AUDIT DATA:

Business: ${auditData.businessName || "Service Business"}
Monthly Revenue: ${fmt(r.rev)}
Annual Target: ${fmt(r.target)}
Earned Revenue/Hour: ${fmt(r.revenuePerHourWorked)}/hr
Capacity Yield/Hour: ${fmt(r.revenuePerHour)}/hr
Capacity Utilization: ${fmtPct(r.utilization)}
Available Hours/Month: ${fmtDec(r.monthlyHrs, 0)}
Booked Hours/Month: ${fmtDec(r.totalServiceHrs, 0)}
Average Ticket: ${fmt(r.avgTicket)}
Total Monthly Bookings: ${fmtNum(r.totalBookings)}
No-Show Rate: ${fmtPct(r.noShow*100)}
Late Cancel Rate: ${fmtPct(r.cancel*100)}
Annual Revenue Lost to No-Shows/Cancels: ${fmt(r.lostRevAnnual)}
Client Lifespan: ${r.lifespan} months
Visits Per Year: ${r.visitsPerYear}
Rebooking Rate: ${fmtPct(r.rebook*100)}
Client LTV: ${fmt(r.ltv)}
New Clients/Month: ${fmtNum(r.newClients)}
Weekly Revenue: ${fmt(r.weeklyRev)}
Revenue Gap to Target: ${fmt(r.revenueGap)}/week (${fmt(r.revenueGapAnnual)}/year)

SERVICE MENU (ranked by revenue per hour):
${r.sortedByRPH.map((s, i) => `${i+1}. ${s.name||"Service"}: ${fmt(s.priceNum)} per appointment, ${fmtDuration(s.durationNum)} duration, ${fmt(s.revenuePerHour)}/hr yield, ${fmtNum(s.bookingsNum)} bookings/mo`).join("\n")}

TOP 3 STRUCTURAL GAPS:
${r.rankedGaps.map((g, i) => `${i+1}. ${g.title} [${g.severity.toUpperCase()}] — Est. Impact: ${fmt(g.dollarImpact)}/year\n   ${g.summary}`).join("\n")}

Generate the 45-day execution plan. Prioritize the #1 ranked gap. Be specific to this business's numbers.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(b => b.type === "text" ? b.text : "").filter(Boolean).join("\n") || "Generation failed. Please try again.";
      const newGens = [...generations, { text, createdAt: new Date().toISOString(), gap: topGap?.title }];
      const newRem = remaining - 1;
      setGenerations(newGens);
      setRemaining(newRem);
      saveGens(newGens, newRem);
    } catch (e) {
      setError("Failed to generate. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionLabel text="AI Execution Engine" />
      <SectionHeading text="AI Execution Engine" sub="Convert your audit into a tactical 45-day execution plan." />

      {maxGens <= 0 ? (
        <Card style={{ padding: 18, marginBottom: 16, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, lineHeight: 1.6 }}>AI is locked for this audit. Add AI (+$27) or unlock Platform for unlimited use.</div>
          <PrimaryButton onClick={onShowPricing} style={{ marginTop: 12, width: "100%" }}>Unlock AI →</PrimaryButton>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.ink, fontFamily: font.body }}><strong>{remaining}</strong> of {maxGens} runs remaining</div>
            <div style={{ height: 4, flex: 1, background: C.line, borderRadius: 2, margin: "0 16px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, (remaining / maxGens) * 100))}%`, background: remaining > 0 ? C.taupe : C.critical, borderRadius: 2, transition: "width 0.4s" }} />
            </div>
          </div>

          {remaining > 0 ? (
            <PrimaryButton onClick={generate} disabled={loading} style={{ width: "100%", marginBottom: 20 }}>
              {loading ? "Generating..." : `Generate Action Plan → (${remaining} left)`}
            </PrimaryButton>
          ) : (
            <Card style={{ padding: 20, textAlign: "center", marginBottom: 20, border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 13, color: C.taupe, fontFamily: font.body }}>All AI runs used for this audit.{!isPlatform() && " Upgrade to Platform for unlimited."}</div>
            </Card>
          )}
        </>
      )}

      {error && <div style={{ fontSize: 12, color: C.critical, fontFamily: font.body, marginBottom: 16 }}>{error}</div>}

      {generations.map((gen, i) => (
        <Card key={i} style={{ marginBottom: 14, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.taupe, fontFamily: font.body, textTransform: "uppercase" }}>Generation {i+1} — {gen.gap || "Primary Gap"}</span>
            <span style={{ fontSize: 10, color: C.ash, fontFamily: font.body }}>{new Date(gen.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{gen.text}</div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// NAV STRUCTURE — tiered: free horizontal tabs → paid grouped sidebar
// ═══════════════════════════════════════════
const FREE_TABS = [
  { id: "numbers", icon: "📊", label: "The Numbers" },
  { id: "leak", icon: "💸", label: "The Leak" },
  { id: "fix", icon: "🎯", label: "The Fix" },
];
const PAID_NAV = [
  { section: "OVERVIEW", items: [
    { id: "numbers", label: "Snapshot", icon: "📊" },
    { id: "leak", label: "Losses", icon: "💸" },
    { id: "fix", label: "Top Fix", icon: "🎯" },
  ]},
  { section: "YOUR PLAN", items: [
    { id: "lift45", label: "45-Day Action", icon: "📋" },
    { id: "scripts", label: "Client Scripts", icon: "💬" },
    { id: "scorecard", label: "Weekly Scorecard", icon: "✅" },
  ]},
  { section: "TOOLS", items: [
    { id: "ai", label: "AI Engine", icon: "🤖", lock: "ai" },
    { id: "copy", label: "Export", icon: "📄" },
  ]},
];

// ═══════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════

export default function RevenueSnapshot() {
  const [step, setStep] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [activeNav, setActiveNav] = useState("numbers");
  const isFreeTab = ["numbers", "leak", "fix"].includes(activeNav);
  const [showPricing, setShowPricing] = useState(false);
  const contentRef = useRef(null);

  // Auth / tier
  const [loginData, setLoginData] = useState({ name: "", email: "", website: "" });
  const [loginStep, setLoginStep] = useState("form"); // "form" | "verify" | "done"
  const [verifyCode, setVerifyCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  // Tier: "free" | "blueprint" | "blueprint+ai" | "platform-monthly" | "platform-annual"
  const [tier, setTier] = useState("free");
  const [auditId, setAuditId] = useState("");

  // Check for existing Supabase session on mount
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setAuthUser(data.user);
    });
  }, []);

  // Data
  const [data, setData] = useState({
    businessName: "", industry: "", monthlyRevenue: "", targetAnnualIncome: "",
    workingDaysPerWeek: "5", hoursPerDay: "8", weeksPerYear: "50",
    noShowRate: "", cancellationRate: "",
    avgClientLifespanMonths: "", avgVisitsPerYear: "", newClientsPerMonth: "", rebookingRate: "",
    services: [{ name: "", price: "", duration: "", bookings: "" }],
  });
  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  // Persistence
  useEffect(() => {
    try {
      const s = store.get("rs-data");
      if (s) {
        if (s.data) setData(s.data);
        if (s.loginData) { setLoginData(s.loginData); setLoginStep("done"); }
        if (s.tier) setTier(s.tier);
        if (s.auditId) setAuditId(s.auditId);
        if (s.step === 6) setStep(6);
      }
    } catch {}
  }, []);

  const save = useCallback((ov = {}) => {
    store.set("rs-data", { data: ov.data || data, loginData: ov.loginData || loginData, tier: ov.tier || tier, auditId: ov.auditId || auditId, step: ov.step !== undefined ? ov.step : step, savedAt: new Date().toISOString() });
  }, [data, loginData, tier, auditId, step]);

  const goTo = (n) => { setAnimate(false); setTimeout(() => { setStep(n); setAnimate(true); if (contentRef.current) contentRef.current.scrollTop = 0; save({ step: n }); }, 180); };

  const access = useMemo(() => {
    const platform = isPlatform();
    const blueprint = hasBlueprint(auditId);
    const ai = hasAI(auditId);
    return { platform, blueprint, ai };
  }, [auditId]);
  const hasBP = access.blueprint;
  const hasAi = access.ai;
  const isPlatformTier = access.platform;

  // ─── Calculations ───
  const r = useMemo(() => {
    const rev = parseFloat(data.monthlyRevenue)||0, target = parseFloat(data.targetAnnualIncome)||0;
    const daysWk = parseFloat(data.workingDaysPerWeek)||5, hrsDay = parseFloat(data.hoursPerDay)||8, wksYr = parseFloat(data.weeksPerYear)||50;
    const noShow = (parseFloat(data.noShowRate)||0)/100, cancel = (parseFloat(data.cancellationRate)||0)/100;
    const lifespan = parseFloat(data.avgClientLifespanMonths)||12, visitsPerYear = parseFloat(data.avgVisitsPerYear)||12;
    const visitsPerMo = visitsPerYear/12, newClients = parseFloat(data.newClientsPerMonth)||0, rebook = (parseFloat(data.rebookingRate)||0)/100;

    const monthlyHrs = daysWk*hrsDay*(wksYr/12), weeklyHrs = daysWk*hrsDay, annualHrs = daysWk*hrsDay*wksYr;
    const annualRev = rev*12, weeklyRev = wksYr > 0 ? rev/(wksYr/12) : 0, ninetyDayRev = rev*3;

    const services = data.services.map(s => {
      const price = parseFloat(s.price)||0, dur = parseFloat(s.duration)||60, bookings = parseFloat(s.bookings)||0;
      const monthlyRev = price*bookings, revenuePerHour = dur > 0 ? price/(dur/60) : 0, hoursUsed = (dur/60)*bookings;
      return { ...s, priceNum: price, durationNum: dur, bookingsNum: bookings, monthlyRev, revenuePerHour, hoursUsed };
    });

    const totalServiceRev = services.reduce((a,s) => a+s.monthlyRev, 0);
    const totalServiceHrs = services.reduce((a,s) => a+s.hoursUsed, 0);
    const totalBookings = services.reduce((a,s) => a+s.bookingsNum, 0);
    const revenuePerHour = monthlyHrs > 0 ? rev/monthlyHrs : 0;
    const revenuePerHourWorked = totalServiceHrs > 0 ? totalServiceRev/totalServiceHrs : revenuePerHour;
    const utilization = monthlyHrs > 0 ? (totalServiceHrs/monthlyHrs)*100 : 0;
    const unusedHours = Math.max(0, monthlyHrs - totalServiceHrs);
    const avgTicket = totalBookings > 0 ? totalServiceRev/totalBookings : 0;
    const lostRate = noShow + cancel, lostRevMonthly = rev*lostRate, lostRevAnnual = lostRevMonthly*12;
    const ltv = avgTicket * visitsPerMo * lifespan;
    const requiredWeeklyRev = target > 0 && wksYr > 0 ? target/wksYr : 0;
    const revenueGap = Math.max(0, requiredWeeklyRev - weeklyRev), revenueGapAnnual = revenueGap*wksYr;
    const revenueAtCapacity = monthlyHrs * revenuePerHourWorked;
    const sortedByRPH = [...services].filter(s => s.priceNum > 0).sort((a,b) => b.revenuePerHour - a.revenuePerHour);
    const terms = getTerms(data.industry);

    // Gap engine
    const allGaps = [];
    if (utilization < 75) { const iC = utilization < 50; allGaps.push({ id: "capacity", title: "Unfilled Capacity", severity: iC ? "critical" : "moderate", impact: iC ? 95 : 70, dollarImpact: unusedHours*0.4*revenuePerHourWorked*12, summary: `you're using ${fmtPct(utilization)} of available hours, leaving ${fmtDec(unusedHours,0)} hours unfilled every month. That's ${fmt(unusedHours*revenuePerHourWorked)}/month in potential revenue sitting empty.`, fix: `Focus on filling ${fmtDec(unusedHours*0.4,0)} hours/month through rebooking optimization, waitlist management, and strategic scheduling of your highest-yield ${terms.service}s in open slots.`, result: `Utilization rises to ${fmtPct(Math.min(utilization+15,90))}+. Adds ${fmt(unusedHours*0.4*revenuePerHourWorked)}/month without adding a single new ${terms.service}.` }); }
    if (lostRate > 0.05) { const iC = lostRate > 0.15; allGaps.push({ id: "schedule", title: "Schedule Protection", severity: iC ? "critical" : lostRate > 0.08 ? "moderate" : "minor", impact: iC ? 90 : 60, dollarImpact: lostRevAnnual, summary: `${fmtPct(lostRate*100)} of your ${terms.appointment}s don't happen. That's ${fmt(lostRevMonthly)}/month walking out the door.`, fix: `Require a $25–50 deposit at booking. Applied to the ${terms.service}, refundable with 24hr notice. Add automated reminders at 48hr and 24hr.`, result: `No-show rate drops to 2–3%. That's ${fmt(lostRevAnnual*0.75)}+ recovered in year 1.` }); }
    if (sortedByRPH.length >= 2) { const sp = sortedByRPH[0].revenuePerHour/Math.max(sortedByRPH[sortedByRPH.length-1].revenuePerHour,1); if (sp > 1.3) allGaps.push({ id: "yield", title: "Service Yield Misalignment", severity: sp > 2.5 ? "critical" : sp > 1.8 ? "moderate" : "minor", impact: sp > 2.5 ? 85 : 55, dollarImpact: (sortedByRPH[0].revenuePerHour - sortedByRPH[sortedByRPH.length-1].revenuePerHour)*4*12, summary: `${fmtDec(sp,1)}x spread between ${sortedByRPH[0].name||"top"} (${fmt(sortedByRPH[0].revenuePerHour)}/hr) and ${sortedByRPH[sortedByRPH.length-1].name||"lowest"} (${fmt(sortedByRPH[sortedByRPH.length-1].revenuePerHour)}/hr). Low-yield ${terms.service}s are diluting your hourly rate.`, fix: `Shift volume toward ${sortedByRPH[0].name||"your top service"}. Reprice or shorten low-yield ${terms.service}s. Consider bundling instead of discounting.`, result: `Average revenue per hour increases toward ${fmt(sortedByRPH[0].revenuePerHour)}/hr without adding hours.` }); }
    const reqRPH = annualHrs > 0 && target > 0 ? target/annualHrs : 0;
    if (avgTicket > 0 && (reqRPH > 0 ? revenuePerHourWorked < reqRPH*0.85 : avgTicket < 100)) { allGaps.push({ id: "pricing", title: "Pricing Gap", severity: reqRPH > 0 && revenuePerHourWorked < reqRPH*0.6 ? "critical" : "moderate", impact: 70, dollarImpact: rev*0.15*12, summary: `your earned rate of ${fmt(revenuePerHourWorked)}/hr ${reqRPH > 0 ? `is below the ${fmt(reqRPH)}/hr needed to hit your target` : "suggests pricing opportunity"}. Your time is undervalued.`, fix: `Implement a 10–15% price adjustment on your core ${terms.service}s. Frame around value delivered, not cost. Use the pricing script in your Lift Plan.`, result: `A 15% adjustment adds ${fmt(rev*0.15)}/month — that's ${fmt(rev*0.15*12)}/year with zero additional hours.` }); }
    if (lifespan < 18 || rebook < 0.65) { const ltvGain = avgTicket*visitsPerMo*6; allGaps.push({ id: "retention", title: "Rebooking & Retention", severity: lifespan < 8 || rebook < 0.4 ? "critical" : "moderate", impact: 65, dollarImpact: ltvGain*newClients*12, summary: `only ${fmtPct(rebook*100)} of ${terms.client}s book their next ${terms.appointment} before leaving. Every ${terms.client} who doesn't rebook = ${fmt(ltvGain)} in lifetime value at risk.`, fix: `Implement checkout rebooking: always offer exactly 2 time slots before the ${terms.client} leaves. Never ask "would you like to rebook?" — assume the next ${terms.appointment}.`, result: `Rebooking rate rises to 75%+. Extending each ${terms.client} relationship by 6 months adds ${fmt(ltvGain)} per ${terms.client}.` }); }
    if (target > 0 && revenueGap > 0) { const gs = revenueGapAnnual/target; allGaps.push({ id: "target", title: "Target Revenue Gap", severity: gs > 0.3 ? "critical" : gs > 0.1 ? "moderate" : "minor", impact: gs > 0.3 ? 88 : 55, dollarImpact: revenueGapAnnual, summary: `you're ${fmt(revenueGap)}/week below your stated target. At current pace, that's a ${fmt(revenueGapAnnual)} annual shortfall.`, fix: `Close this through the combination of fixes above — schedule protection, rebooking, and pricing adjustments compound together.`, result: `Addressing the top 2 gaps typically closes 60–80% of target gaps within 90 days.` }); }

    const rankedGaps = allGaps.sort((a,b) => b.impact - a.impact).slice(0,3);

    const clampedUtil = Math.min(utilization, 100);
    let score = 55;
    if (clampedUtil >= 80) score += 12; else if (clampedUtil >= 65) score += 5; else score -= 6;
    if (lostRate <= 0.05) score += 8; else if (lostRate <= 0.12) score += 2; else score -= 6;
    if (revenuePerHour >= 150) score += 10; else if (revenuePerHour >= 80) score += 4; else score -= 4;
    if (lifespan >= 18) score += 8; else if (lifespan >= 8) score += 2; else score -= 4;
    if (rebook >= 0.7) score += 7; else if (rebook >= 0.4) score += 2; else score -= 3;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return { rev, annualRev, weeklyRev, ninetyDayRev, target, revenuePerHour, revenuePerHourWorked, utilization, unusedHours, avgTicket, monthlyHrs, weeklyHrs, annualHrs, totalServiceHrs, totalBookings, noShow, cancel, lostRate, lostRevMonthly, lostRevAnnual, ltv, lifespan, visitsPerMo, visitsPerYear, newClients, rebook, requiredWeeklyRev, revenueGap, revenueGapAnnual, revenueAtCapacity, services, sortedByRPH, totalServiceRev, rankedGaps, score, daysWk, hrsDay, wksYr, terms };
  }, [data]);

  // Service CRUD
  const addSvc = () => setData(d => ({...d, services: [...d.services, { name: "", price: "", duration: "", bookings: "" }]}));
  const updSvc = (i,s) => { const a = [...data.services]; a[i] = s; setData(d => ({...d, services: a})); };
  const rmSvc = (i) => setData(d => ({...d, services: d.services.filter((_,x) => x !== i)}));

  function NavButtons({ onBack, onNext, canNext, nextLabel="Continue →" }) {
    return <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
      {onBack && <SecondaryButton onClick={onBack}>← Back</SecondaryButton>}
      <PrimaryButton onClick={onNext} disabled={!canNext} style={{ flex: 1 }}>{nextLabel}</PrimaryButton>
    </div>;
  }

  // ═══════════════════════════════════════
  // WIZARD STEPS
  // ═══════════════════════════════════════
  const renderStep = () => {
    switch(step) {
      case 0: return (
        <div style={{ textAlign: "center", padding: "80px 20px 60px", maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 5, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: 40 }}>Flowe Collective</div>
          <h1 style={{ fontSize: 52, fontWeight: 300, color: C.ink, fontFamily: font.display, lineHeight: 1.08, margin: "0 0 8px" }}>The Revenue</h1>
          <h1 style={{ fontSize: 52, fontWeight: 400, fontStyle: "italic", color: C.goldDark, fontFamily: font.display, lineHeight: 1.08, margin: "0 0 28px" }}>Snapshot</h1>
          <div style={{ width: 50, height: 1, background: C.gold, margin: "0 auto 32px" }} />
          <p style={{ fontSize: 16, color: C.goldDark, fontFamily: font.display, margin: "0 0 24px", fontStyle: "italic", lineHeight: 1.6 }}>Precision creates power.</p>
          <p style={{ fontSize: 14, color: C.ash, fontFamily: font.body, margin: "0 auto 48px", maxWidth: 400, lineHeight: 1.8, fontWeight: 300 }}>Designed for appointment-based service professionals. Understand exactly how your business generates revenue and where the structural gaps are.</p>
          <PrimaryButton onClick={() => goTo(1)}>Begin Assessment</PrimaryButton>
          <p style={{ fontSize: 11, color: C.ash, fontFamily: font.body, marginTop: 28, fontWeight: 300, letterSpacing: 0.5 }}>~3 minutes · Averages and estimates are perfectly fine</p>
        </div>
      );

      case 1: return (
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <SectionLabel text="Before We Begin" />
          <SectionHeading text="Create Your Snapshot" sub="We'll save your results so you can return anytime." />
          {loginStep === "form" && <>
            <InputField label="Full Name" value={loginData.name} onChange={v => setLoginData(d => ({...d, name: v}))} type="text" placeholder="Your name" />
            <InputField label="Email Address" hint="We'll send a 6-digit verification code." value={loginData.email} onChange={v => setLoginData(d => ({...d, email: v}))} type="email" placeholder="you@example.com" />
            <InputField label="Website or Social" value={loginData.website} onChange={v => setLoginData(d => ({...d, website: v}))} type="text" placeholder="@handle or yoursite.com" />
            {authError && <div style={{ fontSize: 12, color: C.critical, fontFamily: font.body, marginBottom: 12 }}>{authError}</div>}
            <PrimaryButton onClick={async () => {
              if (!loginData.name || !loginData.email.includes("@")) return;
              setAuthLoading(true);
              setAuthError("");
              try {
                if (!supabase) { setAuthError("Connection error. Please refresh the page."); setAuthLoading(false); return; }
                const { error } = await supabase.auth.signInWithOtp({ email: loginData.email });
                if (error) { setAuthError(error.message); setAuthLoading(false); return; }
                setLoginStep("verify");
              } catch (e) { setAuthError("Something went wrong. Try again."); }
              setAuthLoading(false);
            }} disabled={!loginData.name || !loginData.email.includes("@") || authLoading} style={{ width: "100%" }}>
              {authLoading ? "Sending..." : "Send Verification Code →"}
            </PrimaryButton>
          </>}
          {loginStep === "verify" && <>
            <NoteBox icon="📧">A 6-digit code has been sent to <strong>{loginData.email}</strong>. Check your inbox (and spam).</NoteBox>
            <InputField label="Verification Code" value={verifyCode} onChange={setVerifyCode} type="text" placeholder="000000" />
            {authError && <div style={{ fontSize: 12, color: C.critical, fontFamily: font.body, marginBottom: 12 }}>{authError}</div>}
            <PrimaryButton onClick={async () => {
              setAuthLoading(true);
              setAuthError("");
              try {
                const { data: authData, error } = await supabase.auth.verifyOtp({
                  email: loginData.email,
                  token: verifyCode,
                  type: "email",
                });
                if (error) { setAuthError(error.message); setAuthLoading(false); return; }
                setAuthUser(authData.user);
                setLoginStep("done");
                const aid = "audit_" + Date.now();
                setAuditId(aid);
                save({ loginData, auditId: aid, step: 2 });
                goTo(2);
              } catch (e) { setAuthError("Invalid code. Try again."); }
              setAuthLoading(false);
            }} disabled={verifyCode.length < 6 || authLoading} style={{ width: "100%" }}>
              {authLoading ? "Verifying..." : "Verify & Continue →"}
            </PrimaryButton>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button onClick={() => { setLoginStep("form"); setVerifyCode(""); setAuthError(""); }} style={{ background: "none", border: "none", color: C.taupe, fontSize: 12, fontFamily: font.body, cursor: "pointer", textDecoration: "underline" }}>Use a different email</button>
            </div>
          </>}
        </div>
      );

      case 2: return (
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <SectionLabel text="Step 01 — Your Business" />
          <SectionHeading text="Current Revenue Position" sub="Averages and estimates work great here." />
          <InputField label="Business Name" value={data.businessName} onChange={v => update("businessName", v)} type="text" placeholder="e.g. The Method Studio" />
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 4, fontFamily: font.body }}>Industry</label>
            <div style={{ fontSize: 11, color: C.taupe, marginBottom: 8, fontFamily: font.body, lineHeight: 1.5 }}>This personalizes your scripts and pre-fills example services.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(INDUSTRIES).map(([id, ind]) => (
                <button key={id} onClick={() => update("industry", id)} style={{
                  background: data.industry === id ? C.gold : "transparent",
                  color: data.industry === id ? C.ink : C.ash,
                  border: `1px solid ${data.industry === id ? C.gold : C.line}`,
                  borderRadius: 2, padding: "8px 14px", fontSize: 11, fontWeight: 500,
                  fontFamily: font.body, cursor: "pointer", transition: "all 0.15s",
                }}>{ind.label}</button>
              ))}
            </div>
          </div>
          <InputField label="Average Monthly Revenue" hint="Gross revenue per month. Used to estimate 90-day and annual trajectory." value={data.monthlyRevenue} onChange={v => update("monthlyRevenue", v)} prefix="$" />
          <InputField label="Target Annual Income" value={data.targetAnnualIncome} onChange={v => update("targetAnnualIncome", v)} prefix="$" />
          <Divider />
          <SectionHeading text="Current Operating Schedule" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 12 }}>
            <InputField label="Days/Wk" value={data.workingDaysPerWeek} onChange={v => update("workingDaysPerWeek", v)} />
            <InputField label="Hrs/Day" value={data.hoursPerDay} onChange={v => update("hoursPerDay", v)} />
            <InputField label="Wks/Yr" value={data.weeksPerYear} onChange={v => update("weeksPerYear", v)} />
          </div>
          <HintBox>≈ <strong>{fmtNum(r.monthlyHrs)}</strong> service hours/month · <strong>{fmtNum(r.annualHrs)}</strong>/year</HintBox>
          <NavButtons onNext={() => { save(); goTo(3); }} canNext={data.monthlyRevenue} nextLabel="Continue to Services →" />
        </div>
      );

      case 3: return (
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <SectionLabel text="Step 02 — Services" />
          <SectionHeading text="Your Service Menu" sub={`List each ${r.terms.service} with price, duration, and monthly volume.`} />
          <HintBox>Estimates are fine. Directional accuracy is what matters.</HintBox>
          {data.industry && data.industry !== "other" && data.services.length === 1 && !data.services[0].name && (
            <Card style={{ marginBottom: 16, padding: "16px 18px", border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.5, marginBottom: 10 }}>Start with example {INDUSTRIES[data.industry]?.label || ""} services? You can edit everything.</div>
              <SecondaryButton onClick={() => {
                const tmpl = INDUSTRIES[data.industry]?.services || [];
                if (tmpl.length) setData(d => ({ ...d, services: tmpl.map(s => ({ ...s })) }));
              }} style={{ padding: "10px 16px", fontSize: 11 }}>Load {INDUSTRIES[data.industry]?.label || ""} Templates</SecondaryButton>
            </Card>
          )}
          {data.services.map((s,i) => <ServiceInput key={i} service={s} index={i} onChange={s => updSvc(i,s)} onRemove={() => rmSvc(i)} canRemove={data.services.length > 1} />)}
          <button onClick={addSvc} style={{ width: "100%", background: "transparent", border: `1px dashed ${C.gold}40`, borderRadius: 2, padding: 14, color: C.gold, fontSize: 12, cursor: "pointer", fontFamily: font.body, fontWeight: 500, letterSpacing: 1.5 }}>+ Add Service</button>
          {r.totalServiceHrs > 0 && <Card style={{ marginTop: 20, padding: "18px 20px", border: `1px solid ${r.utilization > 100 ? "#D4785055" : C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.taupe, fontFamily: font.body, textTransform: "uppercase" }}>Service Hours Summary</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: r.utilization > 100 ? "#B85C3A" : C.ash, fontFamily: font.body }}>{fmtPct(Math.min(r.utilization,100))}</span>
            </div>
            <div style={{ height: 6, background: "#EBE9E5", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${Math.min(r.utilization,100)}%`, background: r.utilization > 100 ? "#B85C3A" : C.gold, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ink, fontFamily: font.body }}>
              <span><strong>{fmtDec(r.totalServiceHrs,1)}</strong> hrs booked</span>
              <span><strong>{fmtDec(r.monthlyHrs,0)}</strong> hrs available</span>
            </div>
          </Card>}
          <NavButtons onBack={() => goTo(2)} onNext={() => { save(); goTo(4); }} canNext={data.services.some(s => s.price)} nextLabel="Continue to Schedule →" />
        </div>
      );

      case 4: return (
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <SectionLabel text="Step 03 — Schedule Protection" />
          <SectionHeading text="Cancellations & No-Shows" sub="Every missed appointment is unrecoverable revenue." />
          <InputField label="No-Show Rate" hint="Out of 100 appointments, how many don't show?" value={data.noShowRate} onChange={v => update("noShowRate", v)} suffix="%" placeholder="e.g. 5" />
          <InputField label="Late Cancellation Rate" hint="How many cancel too late to rebook?" value={data.cancellationRate} onChange={v => update("cancellationRate", v)} suffix="%" placeholder="e.g. 8" />
          <NavButtons onBack={() => goTo(3)} onNext={() => { save(); goTo(5); }} canNext nextLabel="Continue to Retention →" />
        </div>
      );

      case 5: return (
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <SectionLabel text="Step 04 — Retention" />
          <SectionHeading text="Client Lifetime Architecture" sub="How long clients stay and how often they return." />
          <NoteBox icon="📋">If you use a booking system (Square, Vagaro, Boulevard, etc.), pull reports for these averages. Otherwise, estimates work.</NoteBox>
          <InputField label="Average Client Relationship Length" hint="From first appointment to last — how many months before most clients stop coming back?" value={data.avgClientLifespanMonths} onChange={v => update("avgClientLifespanMonths", v)} suffix="months" placeholder="e.g. 12" />
          <InputField label="Average Visits Per Year" hint="Monthly ≈ 12. Every 6 weeks ≈ 8. Quarterly ≈ 4." value={data.avgVisitsPerYear} onChange={v => update("avgVisitsPerYear", v)} suffix="visits/year" placeholder="e.g. 8" />
          <InputField label="New Clients Per Month" value={data.newClientsPerMonth} onChange={v => update("newClientsPerMonth", v)} suffix="clients" placeholder="e.g. 6" />
          <InputField label="Rebooking Rate" hint="Of every 10 clients, how many book their next visit before leaving? 7 out of 10 = 70%." value={data.rebookingRate} onChange={v => update("rebookingRate", v)} suffix="%" placeholder="e.g. 60" />
          <NavButtons onBack={() => goTo(4)} onNext={() => { save({ step: 6 }); goTo(6); }} canNext nextLabel="View Revenue Snapshot →" />
        </div>
      );

      default: return null;
    }
  };

  // ═══════════════════════════════════════
  // RESULTS DASHBOARD
  // ═══════════════════════════════════════
  function ResultsContent() {
    const topGap = r.rankedGaps[0];
    const unfilledLeakage = r.unusedHours * 0.4 * r.revenuePerHourWorked * 12;
    const totalLeakage = r.lostRevAnnual + unfilledLeakage;
    const missingAccuracy = !data.noShowRate && !data.cancellationRate && !data.avgClientLifespanMonths && !data.rebookingRate;

    return <>
      {/* Improve Accuracy banner */}
      {missingAccuracy && (
        <Card style={{ marginBottom: 18, padding: "18px 20px", border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 6 }}>Improve Accuracy (Optional)</div>
          <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.6 }}>Want more precise loss + lift estimates? Add no-shows/cancels + retention inputs.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <SecondaryButton onClick={() => goTo(4)} style={{ padding: "12px 16px" }}>Add Schedule Inputs</SecondaryButton>
            <SecondaryButton onClick={() => goTo(5)} style={{ padding: "12px 16px" }}>Add Retention Inputs</SecondaryButton>
          </div>
        </Card>
      )}

      {/* ═══ FREE RESULTS — 3-tab horizontal system ═══ */}
      {isFreeTab && (
        <div>
          {/* ── Edit Numbers Link ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => goTo(2)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: C.ash, fontFamily: font.body, padding: "4px 8px", textDecoration: "underline" }}>✏️ Edit Numbers</button>
          </div>
          {/* ── Horizontal Tab Bar ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, marginBottom: 28 }}>
            {FREE_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveNav(tab.id)} style={{
                flex: 1, background: "transparent", border: "none",
                borderBottom: activeNav === tab.id ? `2px solid ${C.ink}` : "2px solid transparent",
                padding: "14px 8px 12px", cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 14, marginBottom: 2 }}>{tab.icon}</div>
                <div style={{ fontSize: 11, fontWeight: activeNav === tab.id ? 700 : 500, letterSpacing: 1.5, textTransform: "uppercase", color: activeNav === tab.id ? C.ink : C.ash, fontFamily: font.body }}>{tab.label}</div>
              </button>
            ))}
          </div>

          {/* ── TAB 1: THE NUMBERS ── */}
          {activeNav === "numbers" && (
            <div>
              <SectionLabel text="Your Current Position" />
              <MetricCard label="What You Make Per Hour" value={fmt(r.revenuePerHourWorked) + " /hr"} hero sub="This is your most important number." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <MetricCard label="Monthly Revenue" value={fmt(r.rev)} />
                <MetricCard label={"Average Per " + (r.terms.client.charAt(0).toUpperCase() + r.terms.client.slice(1))} value={fmt(r.avgTicket)} sub={`${fmtNum(r.totalBookings)} ${r.terms.appointment}s/mo`} />
              </div>
              <Divider />
              <SectionLabel text="How Busy You Are" />
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: font.body }}>Capacity</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: r.utilization >= 80 ? C.ink : C.taupe, fontFamily: font.body }}>{fmtPct(Math.min(r.utilization,100))}</span>
                </div>
                <div style={{ height: 8, background: "#EBE9E5", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(r.utilization,100)}%`, background: r.utilization >= 80 ? C.ink : C.taupe, borderRadius: 4, transition: "width 0.6s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: C.ink, fontFamily: font.body }}>
                  <span><strong>{fmtDec(r.totalServiceHrs,0)}</strong> hrs booked</span>
                  <span><strong>{fmtDec(r.monthlyHrs,0)}</strong> hrs available</span>
                </div>
              </Card>
              {r.unusedHours > 0 && (
                <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.6, padding: "0 2px", marginBottom: 14 }}>
                  💡 You have <strong>{fmtDec(r.unusedHours,0)} empty hours</strong> every month.
                </div>
              )}
              {r.target > 0 && <>
                <Divider />
                <SectionLabel text="Your Target" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <MetricCard label="Annual Target" value={fmt(r.target)} />
                  <MetricCard label="Current Trajectory" value={fmt(r.annualRev)} sub={r.revenueGap > 0 ? `${fmt(r.revenueGapAnnual)} below target` : "On pace"} gold={r.revenueGap > 0} />
                </div>
              </>}
              <div style={{ marginTop: 28 }}>
                <PrimaryButton onClick={() => setActiveNav("leak")} style={{ width: "100%" }}>Continue to "The Leak" →</PrimaryButton>
              </div>
            </div>
          )}

          {/* ── TAB 2: THE LEAK ── */}
          {activeNav === "leak" && (
            <div>
              <SectionLabel text="What You're Losing" />
              <Card style={{ padding: "28px 22px", marginBottom: 20, border: `1px solid ${C.critical}18` }}>
                <div style={{ fontSize: 42, fontWeight: 500, color: C.ink, fontFamily: font.display, lineHeight: 1.05, marginBottom: 6 }}>{fmt(totalLeakage)}<span style={{ fontSize: 14, color: C.taupe, fontFamily: font.body }}> /year</span></div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: r.lostRevAnnual > 0 ? C.critical : C.taupe, fontFamily: font.body, marginBottom: 8 }}>{r.lostRevAnnual > 0 ? "Revenue Walking Out the Door" : "Unrealized Revenue Potential"}</div>
                <div style={{ fontSize: 13, color: C.taupe, fontFamily: font.body, lineHeight: 1.6 }}>{r.lostRevAnnual > 0 ? "This is what no-shows, cancellations, and empty hours are costing you." : r.unusedHours > 0 ? "This is what unfilled capacity is costing you in unrealized revenue." : "Your schedule is well-protected."}</div>
              </Card>

              <SectionLabel text="Where It's Going" />

              {/* No-shows & Cancellations */}
              {r.lostRevAnnual > 0 && (
                <Card style={{ marginBottom: 14, padding: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.critical, fontFamily: font.body }}>No-Shows & Cancellations</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: C.ink, fontFamily: font.display, marginBottom: 6 }}>{fmt(r.lostRevAnnual)}<span style={{ fontSize: 13, color: C.taupe, fontFamily: font.body }}> /year</span></div>
                  <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7 }}>
                    {fmtPct((r.noShow + r.cancel)*100)} of {r.terms.appointment}s don't happen.{" "}
                    That's <strong>{fmt(r.lostRevMonthly)}</strong> every single month.
                  </div>
                </Card>
              )}

              {/* Unfilled Hours */}
              {r.unusedHours > 0 && (
                <Card style={{ marginBottom: 14, padding: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>📅</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body }}>Unfilled Hours</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: C.ink, fontFamily: font.display, marginBottom: 6 }}>{fmt(r.unusedHours * r.revenuePerHourWorked * 12)}<span style={{ fontSize: 13, color: C.taupe, fontFamily: font.body }}> /year potential</span></div>
                  <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7 }}>
                    <strong>{fmtDec(r.unusedHours,0)}</strong> empty hours every month.{" "}
                    Fill just half = <strong>+{fmt(r.unusedHours * 0.5 * r.revenuePerHourWorked * 12)}/year</strong>.
                  </div>
                </Card>
              )}

              {/* Clients Not Rebooking */}
              {r.rebook > 0 && r.rebook < 1 && (
                <Card style={{ marginBottom: 14, padding: "22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>🔄</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body }}>{r.terms.client.charAt(0).toUpperCase() + r.terms.client.slice(1)}s Not Rebooking</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: C.ink, fontFamily: font.display, marginBottom: 6 }}>Only {fmtPct(r.rebook*100)}<span style={{ fontSize: 13, color: C.taupe, fontFamily: font.body }}> book their next {r.terms.appointment}</span></div>
                  <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7 }}>
                    Every {r.terms.client} who doesn't rebook = <strong>{fmt(r.ltv)}</strong> in lifetime value at risk.
                  </div>
                </Card>
              )}

              <div style={{ marginTop: 28 }}>
                <PrimaryButton onClick={() => setActiveNav("fix")} style={{ width: "100%" }}>See Your #1 Fix →</PrimaryButton>
              </div>
            </div>
          )}

          {/* ── TAB 3: THE FIX ── */}
          {activeNav === "fix" && (
            <div>
              <SectionLabel text="Your #1 Move" />
              {topGap ? (
                <>
                  <Card gold style={{ padding: "28px 24px", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: C.taupe, fontFamily: font.display }}>1</span>
                      <span style={{ fontSize: 18, fontWeight: 600, color: C.ink, fontFamily: font.body }}>{topGap.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: SEV[topGap.severity]?.color || C.taupe, background: SEV[topGap.severity]?.bg || C.taupe+"12", padding: "4px 10px", borderRadius: 4, fontFamily: font.body, marginLeft: "auto" }}>{SEV[topGap.severity]?.label || topGap.severity}</span>
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 500, color: C.ink, fontFamily: font.display, lineHeight: 1.05, marginBottom: 4 }}>{fmt(topGap.dollarImpact)}<span style={{ fontSize: 14, color: C.taupe, fontFamily: font.body }}> /year</span></div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 14 }}>Recoverable Revenue</div>
                    <p style={{ fontSize: 14, color: C.ink, fontFamily: font.body, lineHeight: 1.7, margin: "0 0 16px" }}>
                      {loginData.name ? loginData.name.split(" ")[0] + ", " : ""}{topGap.summary}
                    </p>
                    {topGap.fix && <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.ink, fontFamily: font.body, marginBottom: 6 }}>The Fix</div>
                      <p style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7, margin: "0 0 14px" }}>{topGap.fix}</p>
                    </>}
                    {topGap.result && <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.ink, fontFamily: font.body, marginBottom: 6 }}>Expected Result</div>
                      <p style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7, margin: 0 }}>{topGap.result}</p>
                    </>}
                  </Card>

                  {/* What else is costing you money? */}
                  {r.rankedGaps.length > 1 && (
                    <Card style={{ padding: "22px 24px", marginBottom: 20, border: `1px solid ${C.line}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 14 }}>What Else Is Costing You Money?</div>
                      {r.rankedGaps.slice(1).map((g, i) => (
                        <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < r.rankedGaps.length - 2 ? 14 : 0 }}>
                          <span style={{ color: C.taupe, fontSize: 13, marginTop: 1 }}>✓</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: font.body }}>Gap #{i+2}: {g.title}</div>
                            <div style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, marginTop: 2 }}>{fmt(g.dollarImpact)}/year opportunity</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: 16 }}>
                        <SecondaryButton onClick={() => setShowPricing(true)} style={{ width: "100%", padding: "12px 20px" }}>See Full Breakdown + Action Plan</SecondaryButton>
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <Card style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: C.taupe, fontFamily: font.body, margin: 0 }}>No significant gaps detected — your revenue architecture is sound.</p>
                </Card>
              )}

              {/* ── BIG CTA ── */}
              <div style={{ padding: "40px 32px", background: C.ink, borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 500, color: C.cream, fontFamily: font.display, lineHeight: 1.2, marginBottom: 8 }}>Ready to fix this?</div>
                <div style={{ fontSize: 13, color: C.ash, fontFamily: font.body, marginBottom: 24 }}>Get your complete 45-day action plan:</div>
                <div style={{ display: "inline-block", textAlign: "left", marginBottom: 28 }}>
                  {[
                    `All ${r.rankedGaps.length} gap${r.rankedGaps.length !== 1 ? "s" : ""} ranked by impact + $ value`,
                    "Week-by-week action plan",
                    "Scripts to use with " + r.terms.client + "s this week",
                    "Weekly scorecard to track progress",
                    "Copy/export your full report",
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 4 ? 12 : 0 }}>
                      <span style={{ color: C.ash, fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 14, color: C.cream, fontFamily: font.body, fontWeight: 400 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <a href={STRIPE.blueprint} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <button style={{ background: C.cream, color: C.ink, border: "none", borderRadius: 4, padding: "18px 48px", fontSize: 15, fontWeight: 600, fontFamily: font.body, letterSpacing: 0.5, cursor: "pointer", transition: "opacity 0.15s", display: "inline-block" }} onMouseOver={e => e.currentTarget.style.opacity="0.9"} onMouseOut={e => e.currentTarget.style.opacity="1"}>Get Complete Plan — $147 →</button>
                  </a>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: C.ash, fontFamily: font.body }}>One-time payment · Instant access</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 4. 45-DAY REVENUE LIFT ($147 BLUEPRINT) ═══ */}
      {activeNav === "lift45" && (
        hasBP ? (
          <div>
            <SectionLabel text="45-Day Lift Plan" />
            <SectionHeading text="Your Gaps + Action Plan" sub="Ranked by impact. Address #1 first." />
            {r.rankedGaps.length > 0 ? <>
              {r.rankedGaps.map((g,i) => <GapCard key={g.id} gap={g} rank={i+1} />)}
              <Card gold style={{ padding: "16px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 6 }}>Primary Lever — Next 45 Days</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, fontFamily: font.body }}>{topGap?.title}</div>
                {topGap?.dollarImpact > 0 && <div style={{ fontSize: 12, color: C.taupe, fontFamily: font.body, marginTop: 4 }}>Est. impact: {fmt(topGap.dollarImpact)}/year</div>}
              </Card>
            </> : <Card style={{ padding: 24, textAlign: "center" }}><p style={{ fontSize: 14, color: C.taupe, fontFamily: font.body, margin: 0 }}>No significant gaps identified.</p></Card>}
            <Divider />
            <SectionLabel text="90-Day Architecture" />
            <SectionHeading text="Three Pillars" sub="Structural adjustments for compounding returns." />
            <div className="rv-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                { t: "Revenue Optimization", pts: [r.revenuePerHourWorked < 100 ? "Evaluate pricing relative to value delivered" : "Maintain pricing structure", r.utilization < 75 ? `Increase density toward ${fmtPct(Math.min(r.utilization+15,90))}` : "Optimize peak-hour priority", r.revenueGap > 0 ? `Close ${fmt(r.revenueGap)}/week gap` : "Expand high-yield volume"] },
                { t: "Retention Mechanics", pts: [r.rebook < 0.7 ? "Implement checkout rebooking" : "Strengthen rebooking compliance", r.lifespan < 12 ? `Extend relationships beyond ${r.lifespan} months` : "Deepen client touchpoints", "Systematize between-visit follow-up"] },
                { t: "Service Yield", pts: [r.sortedByRPH.length >= 2 ? `Shift volume toward ${r.sortedByRPH[0]?.name||"top service"}` : "Audit duration-to-price ratios", r.avgTicket < 120 ? "Increase ticket via bundling" : "Protect ticket from discounting", "Audit time allocation per service"] },
              ].map((p,i) => (
                <Card key={i} style={{ padding: "22px 18px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.taupe, fontFamily: font.body, textTransform: "uppercase", marginBottom: 4 }}>Pillar {i+1}</div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: C.ink, fontFamily: font.display, marginBottom: 16, lineHeight: 1.2 }}>{p.t}</div>
                  {p.pts.map((pt,j) => <div key={j} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: C.ash, flexShrink: 0, marginTop: 6 }} /><span style={{ fontSize: 12, color: C.ink, fontFamily: font.body, lineHeight: 1.5 }}>{pt}</span></div>)}
                </Card>
              ))}
            </div>
            <Divider />
            <SectionLabel text="Client Lifetime Value" />
            <MetricCard label="Average Client LTV" value={fmt(r.ltv)} large gold sub={`${fmt(r.avgTicket)} × ${fmtDec(r.visitsPerMo,1)}/mo × ${r.lifespan}mo`} />
          </div>
        ) : <LockedSection title="45-Day Lift Plan" lockType="blueprint" onUnlock={() => setShowPricing(true)} email={loginData.email} />
      )}

      {/* ═══ 5. CLIENT SCRIPTS ($147 BLUEPRINT) ═══ */}
      {activeNav === "scripts" && (
        hasBP ? (
          <div>
            <SectionLabel text="Client Scripts" />
            <SectionHeading text="Use These This Week" sub={`Copy-paste language customized for your ${r.terms.service} gaps. Edit the bracketed sections.`} />
            {r.lostRate > 0.05 && (
              <Card style={{ marginBottom: 14, padding: "22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 10 }}>Deposit / No-Show Policy</div>
                <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#F0EEEA", borderRadius: 4, padding: "16px 18px", border: `1px solid ${C.line}` }}>
{`"To guarantee your ${r.terms.appointment} time, we hold it with a [$ amount] deposit — applied directly to your ${r.terms.service}. This protects your slot so no one else can book it.

If something comes up, we just ask for [24/48] hours' notice so we can offer that time to someone on our waitlist. Otherwise, the deposit covers the reserved time."`}
                </div>
              </Card>
            )}
            {r.rebook < 0.7 && (
              <Card style={{ marginBottom: 14, padding: "22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 10 }}>Checkout Rebooking</div>
                <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#F0EEEA", borderRadius: 4, padding: "16px 18px", border: `1px solid ${C.line}` }}>
{`"I want to make sure we lock in your next ${r.terms.appointment} before the best times fill up. Based on what we did today, I'd recommend coming back in [X weeks]. I have [day] at [time] or [day] at [time] — which works better?"

Always offer exactly 2 options. Never ask "would you like to rebook?" — assume the next ${r.terms.appointment}.`}
                </div>
              </Card>
            )}
            {r.revenuePerHourWorked < (r.target > 0 ? r.target / r.annualHrs : 100) && (
              <Card style={{ marginBottom: 14, padding: "22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 10 }}>Pricing Reframe</div>
                <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#F0EEEA", borderRadius: 4, padding: "16px 18px", border: `1px solid ${C.line}` }}>
{`"I've updated my pricing to reflect the [training/experience/demand] for this ${r.terms.service}. The investment for [${r.terms.service} name] is now [$ new price], which includes [specific value detail].

Most ${r.terms.client}s tell me it's the best [result] they've experienced — and I want to make sure you're getting that same level of outcome."`}
                </div>
              </Card>
            )}
            <Card style={{ marginBottom: 14, padding: "22px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.taupe, fontFamily: font.body, marginBottom: 10 }}>{r.terms.service.charAt(0).toUpperCase() + r.terms.service.slice(1)} Upgrade</div>
              <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#F0EEEA", borderRadius: 4, padding: "16px 18px", border: `1px solid ${C.line}` }}>
{`"Based on what I'm seeing today, I'd recommend adding [upgrade ${r.terms.service}] — it'll [specific benefit] and the results will last [X longer / look X better]. It's an additional [$XX] and takes about [X minutes]. Want me to add that in?"

Frame the upgrade around their specific situation, not as a generic upsell.`}
              </div>
            </Card>
            <NoteBox icon="📋">These scripts adapt to your audit data. Customize the bracketed sections and test them this week. Track results in the Scorecard tab.</NoteBox>
          </div>
        ) : <LockedSection title="Client Scripts" lockType="blueprint" onUnlock={() => setShowPricing(true)} email={loginData.email} />
      )}

      {/* ═══ 6. WEEKLY KPI TRACKER ($147 BLUEPRINT) ═══ */}
      {activeNav === "scorecard" && (
        hasBP ? (
          <div>
            <SectionLabel text="Weekly Scorecard" />
            <SectionHeading text="Track These Weekly" sub="These are the metrics that determine your trajectory. Review every Monday." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <MetricCard label="Earned Revenue / Hour" value={fmt(r.revenuePerHourWorked) + " /hr"} gold sub={"Capacity yield: " + fmt(r.revenuePerHour) + " /hr"} />
              <MetricCard label="Average Ticket" value={fmt(r.avgTicket)} />
              <MetricCard label="Weekly Revenue" value={fmt(r.weeklyRev)} sub={r.target > 0 ? `Target: ${fmt(r.requiredWeeklyRev)}/wk` : ""} />
              <MetricCard label="Rebooking %" value={fmtPct(r.rebook*100)} sub={r.rebook < 0.7 ? "Goal: 70%+" : "On track"} />
              <MetricCard label="Utilization" value={fmtPct(Math.min(r.utilization,100))} sub={r.utilization < 75 ? "Goal: 75%+" : "Strong"} />
              <MetricCard label="Client LTV" value={fmt(r.ltv)} sub={`${r.lifespan}mo × ${fmtDec(r.visitsPerMo,1)} visits/mo`} />
            </div>
            <div style={{ width: 32, height: 1, background: C.line, margin: "48px auto 24px" }} />
            <p style={{ textAlign: "center", fontSize: 16, color: C.ink, fontFamily: font.display }}>What gets measured gets managed.</p>

            {/* Platform-only: Projections */}
            {isPlatformTier && <>
              <Divider />
              <SectionLabel text="Annual Projection Modeling" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <MetricCard label="Projected Revenue (Optimized)" value={fmt(r.annualRev * 1.2)} gold sub="If top gap is addressed (+20%)" />
                <MetricCard label="Compounded Retention Impact" value={fmt(r.ltv * r.newClients * 12 * 1.15)} sub="15% retention improvement" />
                <MetricCard label="Utilization Forecast" value={fmtPct(Math.min(r.utilization * 1.1, 100))} sub="10% optimization target" />
                <MetricCard label="Risk: Current Trajectory" value={fmt(r.annualRev)} sub="No structural changes" />
              </div>
            </>}
            {!isPlatformTier && <div style={{ marginTop: 24 }}><LockedSection title="Annual Projection Modeling" lockType="platform" onUnlock={() => setShowPricing(true)} email={loginData.email} /></div>}
          </div>
        ) : <LockedSection title="Weekly Scorecard" lockType="blueprint" onUnlock={() => setShowPricing(true)} email={loginData.email} />
      )}

      {/* ═══ 7. AI ENGINE ($27 ADD-ON) ═══ */}
      {activeNav === "ai" && (
        hasAi ? <AIEngine auditData={data} r={r} auditId={auditId} email={loginData.email} onShowPricing={() => setShowPricing(true)} /> : <LockedSection title="AI Execution Engine" lockType="ai" onUnlock={() => setShowPricing(true)} email={loginData.email} />
      )}

      {/* ═══ 8. COPY + PASTE MY AUDIT ($147 BLUEPRINT) ═══ */}
      {activeNav === "copy" && (
        hasBP ? (
          <div>
            <SectionLabel text="Copy Summary" />
            <SectionHeading text="Copy + Paste My Audit" sub="Your complete snapshot in one click. Save it, share it, reference it." />
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 13, color: C.ink, fontFamily: font.body, lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#F0EEEA", borderRadius: 4, padding: "16px 18px", border: `1px solid ${C.line}` }}>
                {`REVENUE SNAPSHOT — ${data.businessName || "Your Business"}
${loginData.name ? `Prepared for: ${loginData.name}` : ""}

CURRENT POSITION
Monthly Revenue: ${fmt(r.rev)}
Earned Revenue/Hr: ${fmt(r.revenuePerHourWorked)}/hr
Average Ticket: ${fmt(r.avgTicket)}
Capacity Utilization: ${fmtPct(Math.min(r.utilization,100))}
Weekly Revenue: ${fmt(r.weeklyRev)}${r.target > 0 ? `\nAnnual Target: ${fmt(r.target)}` : ""}${r.revenueGap > 0 ? `\nRevenue Gap: ${fmt(r.revenueGapAnnual)}/year` : ""}

REVENUE LEAKS
No-Show Rate: ${fmtPct(r.noShow*100)}
Late Cancel Rate: ${fmtPct(r.cancel*100)}
Annual Schedule Leakage: ${fmt(r.lostRevAnnual)}
Unfilled Hours/Month: ${fmtDec(r.unusedHours,0)}

CLIENT RETENTION
Rebooking Rate: ${fmtPct(r.rebook*100)}
Client Lifespan: ${r.lifespan} months
Client LTV: ${fmt(r.ltv)}

TOP STRUCTURAL GAPS
${r.rankedGaps.map((g,i) => `${i+1}. ${g.title} [${g.severity.toUpperCase()}] — ${fmt(g.dollarImpact)}/yr\n   ${g.summary}`).join("\n\n")}

SERVICE YIELD (by revenue per hour)
${r.sortedByRPH.map((s,i) => `${i+1}. ${s.name||"Service"}: ${fmt(s.revenuePerHour)}/hr — ${fmt(s.priceNum)} × ${fmtNum(s.bookingsNum)}/mo`).join("\n")}

Directional diagnostic. Not financial or tax advice.`}
              </div>
              <PrimaryButton onClick={() => {
                const text = `REVENUE SNAPSHOT — ${data.businessName || "Your Business"}\n${loginData.name ? `Prepared for: ${loginData.name}\n` : ""}\nCURRENT POSITION\nMonthly Revenue: ${fmt(r.rev)}\nEarned Revenue/Hr: ${fmt(r.revenuePerHourWorked)}/hr\nAverage Ticket: ${fmt(r.avgTicket)}\nCapacity Utilization: ${fmtPct(Math.min(r.utilization,100))}\nWeekly Revenue: ${fmt(r.weeklyRev)}${r.target > 0 ? `\nAnnual Target: ${fmt(r.target)}` : ""}${r.revenueGap > 0 ? `\nRevenue Gap: ${fmt(r.revenueGapAnnual)}/year` : ""}\n\nREVENUE LEAKS\nNo-Show Rate: ${fmtPct(r.noShow*100)}\nLate Cancel Rate: ${fmtPct(r.cancel*100)}\nAnnual Schedule Leakage: ${fmt(r.lostRevAnnual)}\nUnfilled Hours/Month: ${fmtDec(r.unusedHours,0)}\n\nCLIENT RETENTION\nRebooking Rate: ${fmtPct(r.rebook*100)}\nClient Lifespan: ${r.lifespan} months\nClient LTV: ${fmt(r.ltv)}\n\nTOP STRUCTURAL GAPS\n${r.rankedGaps.map((g,i) => `${i+1}. ${g.title} [${g.severity.toUpperCase()}] — ${fmt(g.dollarImpact)}/yr\n   ${g.summary}`).join("\n\n")}\n\nSERVICE YIELD\n${r.sortedByRPH.map((s,i) => `${i+1}. ${s.name||"Service"}: ${fmt(s.revenuePerHour)}/hr — ${fmt(s.priceNum)} × ${fmtNum(s.bookingsNum)}/mo`).join("\n")}`;
                navigator.clipboard?.writeText(text);
              }} style={{ marginTop: 16, width: "100%" }}>Copy to Clipboard →</PrimaryButton>
            </Card>
          </div>
        ) : <LockedSection title="Copy Summary" lockType="blueprint" onUnlock={() => setShowPricing(true)} email={loginData.email} />
      )}

    </>;
  }

  // ═══════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════
  const wizardLabels = ["Business", "Services", "Protection", "Retention"];
  const wizardIdx = step - 2;

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: font.body }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; } input[type="number"] { -moz-appearance: textfield; } ::selection { background: #E8D5B0; color: #1A1A1A; } ::placeholder { color: #C4BFB8; font-weight: 300; } @media (max-width: 768px) { .rv-flex { flex-direction: column !important; } .rv-nav { display: none !important; } .rv-mnav { display: flex !important; } .rv-content { padding-left: 0 !important; } .rv-3col { grid-template-columns: 1fr !important; } }`}</style>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} email={loginData.email} auditId={auditId} />}

      <div style={{ maxWidth: step === 6 ? (hasBP ? 960 : 620) : 540, margin: "0 auto", padding: "60px 24px", transition: "max-width 0.4s", width: "100%", overflowX: "hidden" }}>
        {step >= 2 && step <= 5 && (
          <div style={{ marginBottom: 48, maxWidth: 440, margin: "0 auto 48px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 14 }}>
              {wizardLabels.map((s,i) => <span key={i} style={{ fontSize: 13, fontWeight: wizardIdx === i ? 400 : 300, fontFamily: font.display, color: wizardIdx >= i ? C.ink : C.line, cursor: "pointer", letterSpacing: 0.5, transition: "color 0.3s" }}>{s}</span>)}
            </div>
            <div style={{ height: 1, background: C.line, position: "relative", maxWidth: 280, margin: "0 auto" }}>
              <div style={{ height: 1, background: C.gold, width: `${(wizardIdx/3)*100}%`, transition: "width 0.5s ease", position: "absolute", top: 0 }} />
            </div>
          </div>
        )}

        {/* Mobile nav */}
        {step === 6 && hasBP && <div className="rv-mnav" style={{ display: "none", overflowX: "auto", gap: 4, marginBottom: 20, paddingBottom: 8, borderBottom: `1px solid ${C.line}` }}>
          {PAID_NAV.flatMap(g => g.items).map(n => {
            const locked = n.lock === "ai" && !hasAi;
            return <button key={n.id} onClick={() => { if (locked) setShowPricing(true); else setActiveNav(n.id); }} style={{ background: activeNav === n.id ? C.gold : "transparent", color: activeNav === n.id ? C.ink : locked ? C.line : C.ash, border: "none", borderRadius: 2, padding: "8px 14px", fontSize: 11, fontWeight: 500, fontFamily: font.body, cursor: "pointer", whiteSpace: "nowrap" }}>{n.icon} {n.label}{locked ? " 🔒" : ""}</button>;
          })}
        </div>}

        <div ref={contentRef} style={{ opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.3s, transform 0.3s" }}>
          {step === 6 ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 5, textTransform: "uppercase", color: C.gold, fontFamily: font.body, marginBottom: 14 }}>Flowe Collective</div>
                <h1 style={{ fontSize: 38, fontWeight: 300, color: C.ink, fontFamily: font.display, margin: "0 0 6px", lineHeight: 1.1 }}>The Revenue Snapshot</h1>
                <div style={{ fontSize: 15, color: C.ash, fontFamily: font.display, fontStyle: "italic" }}>{data.businessName || "Your Business"}{loginData.name ? ` · ${loginData.name}` : ""}</div>
                <div style={{ width: 40, height: 1, background: C.gold, margin: "24px auto 14px" }} />
                <div style={{ fontSize: 10, color: C.ash, fontFamily: font.body, fontWeight: 300, letterSpacing: 0.5 }}>Directional diagnostic. Not financial or tax advice.</div>
                {hasBP && <div style={{ marginTop: 10, display: "inline-block", background: C.gold+"18", padding: "5px 14px", borderRadius: 2, fontSize: 9, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: C.goldDark, fontFamily: font.body }}>{isPlatformTier ? "Unlimited Mode" : hasAi ? "Lift Plan + AI" : "Lift Plan"} ✓</div>}
              </div>
              <div className="rv-flex" style={{ display: "flex", gap: 0 }}>
                {/* Grouped Sidebar — visible when Lift Plan unlocked */}
                {hasBP && (
                  <div className="rv-nav" style={{ width: 180, flexShrink: 0, paddingRight: 28, borderRight: `1px solid ${C.line}` }}>
                    {PAID_NAV.map((group, gi) => (
                      <div key={gi} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.ash, fontFamily: font.body, padding: "0 12px", marginBottom: 4 }}>{group.section}</div>
                        {group.items.map(n => {
                          const active = activeNav === n.id;
                          const locked = n.lock === "ai" && !hasAi;
                          return <div key={n.id} onClick={() => { if (locked) setShowPricing(true); else setActiveNav(n.id); }} style={{ padding: "8px 12px", fontSize: 12, fontWeight: active ? 600 : 400, color: locked ? C.line : active ? C.ink : C.ash, fontFamily: font.body, cursor: "pointer", borderLeft: active ? `2px solid ${C.gold}` : "2px solid transparent", marginLeft: -1, transition: "all 0.2s", letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12 }}>{n.icon}</span>{n.label}{locked && <span style={{ fontSize: 9, marginLeft: "auto" }}>🔒</span>}</div>;
                        })}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <SecondaryButton onClick={() => { setStep(0); setActiveNav("numbers"); }} style={{ fontSize: 11, padding: "8px 14px", width: "100%" }}>Reset</SecondaryButton>
                    </div>
                  </div>
                )}
                <div className="rv-content" style={{ flex: 1, paddingLeft: hasBP ? 28 : 0, minWidth: 0 }}>
                  <ResultsContent />
                </div>
              </div>
            </div>
          ) : renderStep()}
        </div>
      </div>
    </div>
  );
}
