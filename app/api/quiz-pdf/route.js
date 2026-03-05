import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

// Colors
const GOLD = [201, 169, 110];
const GOLD_DARK = [168, 136, 77];
const CHARCOAL = [26, 26, 26];
const MUTED = [107, 100, 96];
const CREAM = [250, 246, 240];
const LINE = [224, 218, 208];

function stripHtml(html) {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&check;/g, "✓")
    .replace(/&middot;/g, "·")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function drawLine(doc, y, width) {
  doc.strokeColor(LINE).lineWidth(0.5)
    .moveTo(50, y).lineTo(width - 50, y).stroke();
}

function drawGoldLine(doc, y, width) {
  doc.strokeColor(GOLD).lineWidth(1)
    .moveTo(50, y).lineTo(width - 50, y).stroke();
}

export async function POST(req) {
  try {
    const { name, archetype, geneKey, sections, strengths, challenge, next, secondary, birthday } = await req.json();

    if (!archetype || !geneKey) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: "Beauty Career Archetype Reading - " + (name || ""),
        Author: "Flowe Collective",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // ═══ HEADER ═══
    doc.fontSize(24).fillColor(CHARCOAL).font("Helvetica")
      .text("FLOWE", 50, 50, { align: "center", characterSpacing: 6 });

    drawGoldLine(doc, 82, pageWidth);

    doc.fontSize(22).fillColor(CHARCOAL).font("Helvetica")
      .text(archetype.name || "", 50, 100, { align: "center" });

    doc.fontSize(11).fillColor(MUTED).font("Helvetica-Oblique")
      .text(archetype.tagline || "", 50, 128, { align: "center" });

    doc.fontSize(9).fillColor(MUTED).font("Helvetica")
      .text("Prepared for " + (name || "") + "  •  " + today, 50, 150, { align: "center" });

    // ═══ GENE KEY BOX ═══
    let y = 180;
    doc.rect(50, y, contentWidth, 24).fill(CREAM).stroke(GOLD);
    doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
      .text("YOUR GENE KEY", 60, y + 8, { characterSpacing: 2 });

    y += 32;
    doc.fontSize(16).fillColor(CHARCOAL).font("Helvetica")
      .text("Gate " + geneKey.gate + " — " + geneKey.name, 60, y);

    y += 24;
    doc.fontSize(9).fillColor(MUTED).font("Helvetica")
      .text("Shadow: " + geneKey.shadow + "    Gift: " + geneKey.gift + "    Siddhi: " + geneKey.siddhi, 60, y);

    y += 24;
    drawLine(doc, y, pageWidth);
    y += 12;

    // ═══ GENE KEY SECTIONS ═══
    const sectionData = [
      { title: "CORE THEME", content: sections?.core },
      { title: "THE SHADOW: " + geneKey.shadow, content: sections?.shadow },
      { title: "THE GIFT: " + geneKey.gift, content: sections?.gift },
      { title: "YOUR NEXT MOVE", content: sections?.move },
    ];

    for (const sec of sectionData) {
      const text = stripHtml(sec.content);
      if (!text) continue;

      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }

      doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
        .text(sec.title, 60, y, { characterSpacing: 1.5 });
      y += 16;

      doc.fontSize(10).fillColor(CHARCOAL).font("Helvetica")
        .text(text, 60, y, { width: contentWidth - 20, lineGap: 4 });
      y = doc.y + 16;

      drawLine(doc, y, pageWidth);
      y += 12;
    }

    // ═══ STRENGTHS ═══
    if (y > doc.page.height - 150) { doc.addPage(); y = 50; }

    doc.rect(50, y, contentWidth, 0).fill(CREAM);
    doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
      .text("YOUR 3 STRENGTHS", 60, y + 4, { characterSpacing: 1.5 });
    y += 20;

    if (strengths) {
      for (const s of strengths) {
        doc.fontSize(10).fillColor(CHARCOAL).font("Helvetica")
          .text("•  " + s, 60, y, { width: contentWidth - 20, lineGap: 3 });
        y = doc.y + 6;
      }
    }
    y += 8;

    // ═══ CHALLENGE ═══
    if (y > doc.page.height - 100) { doc.addPage(); y = 50; }

    doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
      .text("YOUR HIDDEN CHALLENGE", 60, y, { characterSpacing: 1.5 });
    y += 16;

    doc.strokeColor(GOLD).lineWidth(2)
      .moveTo(60, y).lineTo(60, y + 40).stroke();
    doc.fontSize(10).fillColor(CHARCOAL).font("Helvetica")
      .text(challenge || "", 72, y, { width: contentWidth - 32, lineGap: 4 });
    y = doc.y + 16;

    // ═══ NEXT STEPS ═══
    doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
      .text("WHAT TO DO NEXT", 60, y, { characterSpacing: 1.5 });
    y += 16;
    doc.fontSize(10).fillColor(CHARCOAL).font("Helvetica")
      .text(next || "", 60, y, { width: contentWidth - 20, lineGap: 4 });
    y = doc.y + 16;

    // ═══ SECONDARY ═══
    if (secondary) {
      doc.fontSize(8).fillColor(GOLD_DARK).font("Helvetica-Bold")
        .text("SECONDARY INFLUENCE", 60, y, { characterSpacing: 1.5 });
      y += 16;
      doc.fontSize(10).fillColor(CHARCOAL).font("Helvetica-Bold")
        .text(secondary.name, 60, y, { continued: true }).font("Helvetica")
        .text(" — " + secondary.tagline);
      y = doc.y + 16;
    }

    // ═══ CTA BOX ═══
    if (y > doc.page.height - 120) { doc.addPage(); y = 50; }
    y += 8;
    doc.rect(50, y, contentWidth, 80).stroke(GOLD);
    doc.fontSize(14).fillColor(CHARCOAL).font("Helvetica")
      .text("Need clarity on your next move?", 60, y + 12, { align: "center", width: contentWidth - 20 });
    doc.fontSize(10).fillColor(MUTED).font("Helvetica")
      .text("Book a 30-minute Career Direction Call", 60, y + 32, { align: "center", width: contentWidth - 20 });
    doc.fontSize(11).fillColor(GOLD_DARK).font("Helvetica-Bold")
      .text("flowecollective.com/call", 60, y + 50, { align: "center", width: contentWidth - 20 });

    // ═══ FOOTER ═══
    y = doc.page.height - 40;
    drawLine(doc, y, pageWidth);
    doc.fontSize(8).fillColor(MUTED).font("Helvetica")
      .text("Flowe Collective  •  flowecollective.com  •  @flowecollective_", 50, y + 8, { align: "center", width: contentWidth });

    doc.end();

    const buffer = await new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Flowe-Career-Archetype-${(name || "Reading").replace(/\s+/g, "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
