import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req) {
  try {
    const { archetype, geneKey, answers, birthday } = await req.json();

    if (!archetype || !geneKey || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const birthInfo = birthday
      ? `Born: ${birthday.month}/${birthday.day}/${birthday.year}${birthday.time ? " at " + birthday.time : ""}`
      : "Birth date not provided";

    const prompt = `You are a career advisor for beauty professionals at Flowe Collective. A stylist just took our career archetype quiz and we calculated their Gene Key from their birth date.

Their archetype: ${archetype.name} (${archetype.tagline})
${birthInfo}
Their Gene Key: Gate ${geneKey.gate} - ${geneKey.name}
Shadow: ${geneKey.shadow}
Gift: ${geneKey.gift}
Siddhi: ${geneKey.siddhi}
Their answers:
1. What excites them: ${answers[0]}
2. Future vision: ${answers[1]}
3. Current challenge: ${answers[2]}

Write a deeply personalized Gene Key career interpretation for this person. Structure it EXACTLY as four sections separated by these exact headers on their own line:

CORE THEME
(2 paragraphs on what Gene Key ${geneKey.gate} means in beauty careers, speaking directly to them)

THE SHADOW: ${geneKey.shadow}
(2 paragraphs on how this shadow shows up in their career based on their challenge answer, with concrete salon examples)

THE GIFT: ${geneKey.gift}
(2 paragraphs on what becomes possible when the shadow transforms, connected to their archetype and future vision)

YOUR NEXT MOVE
(1 paragraph with one specific actionable thing for this week based on their archetype + Gene Key + challenge)

Use plain dashes not em dashes. Do not use markdown formatting. Use HTML <p> tags for paragraphs and <ul class="gk-list"><li> for lists. Use <span class="gk-hl"> for key phrases you want emphasized. Write in second person. Be warm but direct. About 600 words total.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content?.[0]?.text || "";

    const sections = { core: "", shadow: "", gift: "", move: "" };
    let current = "core";
    text.split("\n").forEach((line) => {
      const l = line.trim().toUpperCase();
      if (l.indexOf("CORE THEME") === 0) current = "core";
      else if (l.indexOf("THE SHADOW") === 0) current = "shadow";
      else if (l.indexOf("THE GIFT") === 0) current = "gift";
      else if (l.indexOf("YOUR NEXT MOVE") === 0) current = "move";
      else sections[current] += line + "\n";
    });

    return NextResponse.json({ sections, raw: text });
  } catch (err) {
    console.error("Quiz reading error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
