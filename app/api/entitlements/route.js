import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getEntitlements, countAiGenerations } from "@/lib/entitlements";

// GET /api/entitlements?audit_id=...
// Client polls this after Stripe redirect to check if purchase landed
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const auditId = searchParams.get("audit_id");

  if (!auditId) {
    return NextResponse.json({ error: "Missing audit_id" }, { status: 400 });
  }

  const supabase = createServerClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const entitlements = await getEntitlements(user.id, auditId);
  const aiGensUsed = entitlements.aiEngine
    ? await countAiGenerations(user.id, auditId)
    : 0;

  return NextResponse.json({
    ...entitlements,
    aiGensUsed,
    aiGensMax: entitlements.unlimited ? null : 3,
  });
}
