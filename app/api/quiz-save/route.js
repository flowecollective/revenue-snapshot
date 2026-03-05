import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const data = await req.json();
    const { email, name, phone, archetype, secondaryType, geneKey, birthday, answers, scores } = data;

    if (!email || !archetype || !geneKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("quiz_sessions")
      .insert({
        email: email.toLowerCase().trim(),
        name,
        phone,
        archetype,
        secondary_type: secondaryType,
        gene_key: geneKey,
        birthday,
        answers,
        scores,
        paid: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Quiz save error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ id: session.id });
  } catch (err) {
    console.error("Quiz save error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
