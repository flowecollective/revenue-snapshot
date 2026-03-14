import { NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "Flowe Collective <noreply@flowecollective.com>";

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, email, archetype, geneKey, strengths, challenge, next, secondaryType, aiSections } = data;

    if (!email || !archetype) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const archetypeNames = {
      ARTIST: "The Master Artist",
      OWNER: "The Future Owner",
      MENTOR: "The Mentor Stylist",
      INFLUENCER: "The Industry Influencer",
    };

    const archetypeName = archetypeNames[archetype] || archetype;

    const aiHtml = aiSections ? `
      <tr><td style="padding:32px 0 0">
        <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 16px">Your Gene Key Reading</p>
        <p style="font-size:11px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#A8884D;margin:0 0 8px">Core Theme</p>
        <div style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7;margin-bottom:24px">${aiSections.core}</div>
        <p style="font-size:11px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#A8884D;margin:0 0 8px">The Shadow</p>
        <div style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7;margin-bottom:24px">${aiSections.shadow}</div>
        <p style="font-size:11px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#A8884D;margin:0 0 8px">The Gift</p>
        <div style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7;margin-bottom:24px">${aiSections.gift}</div>
        <p style="font-size:11px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#A8884D;margin:0 0 8px">Your Move</p>
        <div style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7">${aiSections.move}</div>
      </td></tr>` : "";

    const secondaryHtml = secondaryType ? `
      <tr><td style="padding:24px;background:#FAF6F0;border:1px solid #E0DAD0;margin-top:24px">
        <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 8px">Secondary Influence</p>
        <p style="font-size:14px;font-weight:300;color:#1A1A1A;margin:0">${archetypeNames[secondaryType] || secondaryType}</p>
      </td></tr>` : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF6F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- Header -->
  <tr><td style="text-align:center;padding:0 0 32px">
    <p style="font-size:10px;font-weight:500;letter-spacing:.25em;text-transform:uppercase;color:#C9A96E;margin:0 0 12px">Flowe Collective</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:300;color:#1A1A1A;margin:0 0 8px">Your Career Reading</h1>
    <p style="font-size:14px;font-weight:300;color:#6B6460;margin:0">Prepared for ${name || "you"}</p>
  </td></tr>

  <!-- Archetype -->
  <tr><td style="background:#1A1A1A;padding:32px;text-align:center">
    <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 12px">Your Archetype</p>
    <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#FAF6F0;margin:0 0 8px">${archetypeName}</h2>
    <p style="font-size:12px;font-weight:300;color:#C9A96E;margin:0;font-style:italic">${data.tagline || ""}</p>
  </td></tr>

  <!-- Gene Key -->
  <tr><td style="background:#ffffff;border:1px solid #E0DAD0;padding:24px;margin-top:2px">
    <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 8px">Your Gene Key</p>
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A1A;margin:0 0 12px">Gate ${geneKey.gate} — ${geneKey.name}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;color:#6B6460;font-weight:300;padding:4px 0"><strong style="color:#A8884D">Shadow:</strong> ${geneKey.shadow}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#6B6460;font-weight:300;padding:4px 0"><strong style="color:#A8884D">Gift:</strong> ${geneKey.gift}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:#6B6460;font-weight:300;padding:4px 0"><strong style="color:#A8884D">Siddhi:</strong> ${geneKey.siddhi}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Strengths -->
  <tr><td style="padding:24px;background:#FAF6F0;border:1px solid #E0DAD0;border-top:none">
    <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 12px">Your 3 Strengths</p>
    ${(strengths || []).map((s, i) => `<p style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.6;margin:0 0 8px;padding-left:16px;border-left:2px solid #C9A96E">${s}</p>`).join("")}
  </td></tr>

  <!-- Hidden Challenge -->
  <tr><td style="padding:24px;background:#ffffff;border:1px solid #E0DAD0;border-top:none">
    <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 12px">Your Hidden Challenge</p>
    <p style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7;margin:0;padding-left:16px;border-left:3px solid #C9A96E">${challenge}</p>
  </td></tr>

  <!-- What To Do Next -->
  <tr><td style="padding:24px;background:#FAF6F0;border:1px solid #E0DAD0;border-top:none">
    <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#C9A96E;margin:0 0 12px">What To Do Next</p>
    <p style="font-size:14px;font-weight:300;color:#1A1A1A;line-height:1.7;margin:0">${next}</p>
  </td></tr>

  ${secondaryHtml}
  ${aiHtml}

  <!-- CTA -->
  <tr><td style="padding:40px 0;text-align:center">
    <p style="font-size:14px;font-weight:300;color:#6B6460;margin:0 0 20px;line-height:1.6">Ready to go deeper? Book a Career Direction Call and get personalized guidance on your next move.</p>
    <a href="https://jordanwangco.com/call" style="display:inline-block;background:#C9A96E;color:#1A1A1A;text-decoration:none;font-size:11px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;padding:14px 32px">Book My Career Direction Call</a>
    <p style="font-size:11px;color:#6B6460;font-weight:300;margin:12px 0 0">$99 · 30-minute strategy session · Limited spots weekly</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="border-top:1px solid #E0DAD0;padding:24px 0;text-align:center">
    <p style="font-size:11px;font-weight:400;letter-spacing:.15em;color:#1A1A1A;margin:0 0 8px">FLOWE COLLECTIVE</p>
    <p style="font-size:11px;font-weight:300;color:#6B6460;margin:0">hello@flowecollective.com · @flowecollective_</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `Your ${archetypeName} Reading — Flowe Collective`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return NextResponse.json({ error: resendData.message || "Email failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: resendData.id });
  } catch (err) {
    console.error("Send reading error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
