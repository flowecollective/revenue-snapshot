import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { system, prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: system || "",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, JSON.stringify(data));
      return NextResponse.json({ error: data.error?.message || "AI error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("AI proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
