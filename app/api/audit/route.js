import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getEntitlements } from "@/lib/entitlements";

// POST /api/audit — Save audit data
export async function POST(req) {
  try {
    const { auditId, auditData } = await req.json();

    const supabase = createServerClient();
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Upsert audit
    const { error } = await supabase.from("audits").upsert({
      id: auditId,
      user_id: user.id,
      business_name: auditData.businessName || "",
      industry: auditData.industry || "",
      audit_data: auditData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Save error:", error);
      return NextResponse.json({ error: "Save failed" }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/audit?id=... — Load audit + entitlements
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("id");

  const supabase = createServerClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  if (auditId) {
    // Load specific audit
    const { data: audit } = await supabase
      .from("audits")
      .select("*")
      .eq("id", auditId)
      .eq("user_id", user.id)
      .single();

    if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entitlements = await getEntitlements(user.id, auditId);
    return NextResponse.json({ audit: audit.audit_data, entitlements });
  } else {
    // List user's audits
    const { data: audits } = await supabase
      .from("audits")
      .select("id, business_name, industry, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ audits: audits || [] });
  }
}
