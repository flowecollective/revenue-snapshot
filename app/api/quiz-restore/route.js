import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "No session found" }, { status: 404 });
    }

    return NextResponse.json({
      name: session.name,
      email: session.email,
      phone: session.phone,
      archetype: session.archetype,
      secondaryType: session.secondary_type,
      geneKey: session.gene_key,
      birthday: session.birthday,
      answers: session.answers,
      scores: session.scores,
    });
  } catch (err) {
    console.error("Quiz restore error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
