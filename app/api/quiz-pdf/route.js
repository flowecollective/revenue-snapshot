import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const GOLD = rgb(201/255, 169/255, 110/255);
const GOLD_DARK = rgb(168/255, 136/255, 77/255);
const CHARCOAL = rgb(26/255, 26/255, 26/255);
const MUTED = rgb(107/255, 100/255, 96/255);
const LINE = rgb(224/255, 218/255, 208/255);
const WHITE = rgb(1, 1, 1);

function stripHtml(html) {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "  \u2022 ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&check;/g, "\u2713")
    .replace(/&middot;/g, "\u00B7").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    const w = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(page, text, x, y, font, size, color, maxWidth) {
  const paragraphs = text.split("\n");
  let curY = y;
  const lineHeight = size * 1.6;
  for (const para of paragraphs) {
    if (!para.trim()) { curY -= lineHeight * 0.5; continue; }
    const lines = wrapText(para, font, size, maxWidth);
    for (const line of lines) {
      if (curY < 60) return curY; // stop if near bottom
      page.drawText(line, { x, y: curY, size, font, color });
      curY -= lineHeight;
    }
  }
  return curY;
}

export async function POST(req) {
  try {
    const { name, archetype, geneKey, sections, strengths, challenge, next, secondary } = await req.json();
    if (!archetype || !geneKey) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const pw = 595.28; // A4 width
    const ph = 841.89; // A4 height
    const margin = 50;
    const cw = pw - margin * 2;

    let page = doc.addPage([pw, ph]);
    let y = ph - margin;

    function newPageIfNeeded(needed) {
      if (y < needed + 60) {
        page = doc.addPage([pw, ph]);
        y = ph - margin;
      }
    }

    function drawLine(ly, color) {
      page.drawLine({ start: { x: margin, y: ly }, end: { x: pw - margin, y: ly }, thickness: 0.5, color: color || LINE });
    }

    // ═══ HEADER ═══
    const logoText = "F L O W E";
    const logoW = helvetica.widthOfTextAtSize(logoText, 22);
    page.drawText(logoText, { x: (pw - logoW) / 2, y, size: 22, font: helvetica, color: CHARCOAL });
    y -= 18;
    drawLine(y, GOLD);
    y -= 28;

    const nameText = archetype.name || "";
    const nameW = helvetica.widthOfTextAtSize(nameText, 20);
    page.drawText(nameText, { x: (pw - nameW) / 2, y, size: 20, font: helvetica, color: CHARCOAL });
    y -= 20;

    const tagText = archetype.tagline || "";
    const tagW = helveticaOblique.widthOfTextAtSize(tagText, 10);
    page.drawText(tagText, { x: (pw - tagW) / 2, y, size: 10, font: helveticaOblique, color: MUTED });
    y -= 18;

    const prepText = "Prepared for " + (name || "") + "  \u00B7  " + today;
    const prepW = helvetica.widthOfTextAtSize(prepText, 8);
    page.drawText(prepText, { x: (pw - prepW) / 2, y, size: 8, font: helvetica, color: MUTED });
    y -= 30;

    // ═══ GENE KEY BOX ═══
    page.drawRectangle({ x: margin, y: y - 20, width: cw, height: 20, color: rgb(250/255, 246/255, 240/255), borderColor: GOLD, borderWidth: 0.5 });
    page.drawText("YOUR GENE KEY", { x: margin + 10, y: y - 14, size: 7, font: helveticaBold, color: GOLD_DARK });
    y -= 38;

    const gateText = "Gate " + geneKey.gate + " - " + geneKey.name;
    page.drawText(gateText, { x: margin + 10, y, size: 16, font: helvetica, color: CHARCOAL });
    y -= 22;

    const metaText = "Shadow: " + geneKey.shadow + "    Gift: " + geneKey.gift + "    Siddhi: " + geneKey.siddhi;
    page.drawText(metaText, { x: margin + 10, y, size: 8, font: helvetica, color: MUTED });
    y -= 20;
    drawLine(y);
    y -= 16;

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
      newPageIfNeeded(80);
      y -= 4;
      page.drawText(sec.title, { x: margin + 10, y, size: 9, font: helveticaBold, color: GOLD_DARK });
      y -= 18;
      y = drawText(page, text, margin + 10, y, helvetica, 9, CHARCOAL, cw - 20);
      y -= 12;
      newPageIfNeeded(20);
      drawLine(y);
      y -= 16;
    }

    // ═══ STRENGTHS ═══
    newPageIfNeeded(100);
    y -= 4;
    page.drawText("YOUR 3 STRENGTHS", { x: margin + 10, y, size: 9, font: helveticaBold, color: GOLD_DARK });
    y -= 18;
    if (strengths) {
      for (const s of strengths) {
        const lines = wrapText("\u2022  " + s, helvetica, 9, cw - 20);
        for (const line of lines) {
          if (y < 60) { page = doc.addPage([pw, ph]); y = ph - margin; }
          page.drawText(line, { x: margin + 10, y, size: 9, font: helvetica, color: CHARCOAL });
          y -= 14;
        }
        y -= 2;
      }
    }
    y -= 10;

    // ═══ CHALLENGE ═══
    newPageIfNeeded(80);
    y -= 4;
    page.drawText("YOUR HIDDEN CHALLENGE", { x: margin + 10, y, size: 9, font: helveticaBold, color: GOLD_DARK });
    y -= 18;
    // Gold left border
    const challengeText = stripHtml(challenge || "");
    const chLines = wrapText(challengeText, helvetica, 9, cw - 40);
    const chStartY = y;
    for (const line of chLines) {
      page.drawText(line, { x: margin + 22, y, size: 9, font: helvetica, color: CHARCOAL });
      y -= 14;
    }
    page.drawLine({ start: { x: margin + 12, y: chStartY + 4 }, end: { x: margin + 12, y: y + 10 }, thickness: 2, color: GOLD });
    y -= 14;

    // ═══ NEXT STEPS ═══
    newPageIfNeeded(60);
    y -= 4;
    page.drawText("WHAT TO DO NEXT", { x: margin + 10, y, size: 9, font: helveticaBold, color: GOLD_DARK });
    y -= 18;
    y = drawText(page, stripHtml(next || ""), margin + 10, y, helvetica, 9, CHARCOAL, cw - 20);
    y -= 14;

    // ═══ SECONDARY ═══
    if (secondary) {
      newPageIfNeeded(40);
      y -= 4;
      page.drawText("SECONDARY INFLUENCE", { x: margin + 10, y, size: 9, font: helveticaBold, color: GOLD_DARK });
      y -= 18;
      page.drawText(secondary.name + " - " + secondary.tagline, { x: margin + 10, y, size: 9, font: helvetica, color: CHARCOAL });
      y -= 20;
    }

    // ═══ CTA BOX ═══
    newPageIfNeeded(90);
    y -= 8;
    page.drawRectangle({ x: margin, y: y - 60, width: cw, height: 60, borderColor: GOLD, borderWidth: 0.5 });
    const ctaTitle = "Need clarity on your next move?";
    const ctaTW = helvetica.widthOfTextAtSize(ctaTitle, 13);
    page.drawText(ctaTitle, { x: (pw - ctaTW) / 2, y: y - 18, size: 13, font: helvetica, color: CHARCOAL });
    const ctaSub = "Book a 30-minute Career Direction Call";
    const ctaSW = helvetica.widthOfTextAtSize(ctaSub, 9);
    page.drawText(ctaSub, { x: (pw - ctaSW) / 2, y: y - 34, size: 9, font: helvetica, color: MUTED });
    const ctaUrl = "Book at flowecollective.com";
    const ctaUW = helveticaBold.widthOfTextAtSize(ctaUrl, 10);
    page.drawText(ctaUrl, { x: (pw - ctaUW) / 2, y: y - 50, size: 10, font: helveticaBold, color: GOLD_DARK });

    // ═══ FOOTER ═══
    const footY = 35;
    page.drawLine({ start: { x: margin, y: footY + 10 }, end: { x: pw - margin, y: footY + 10 }, thickness: 0.5, color: LINE });
    const footText = "Flowe Collective  \u00B7  jordanwangco.com  \u00B7  @flowecollective_";
    const footW = helvetica.widthOfTextAtSize(footText, 7);
    page.drawText(footText, { x: (pw - footW) / 2, y: footY, size: 7, font: helvetica, color: MUTED });

    const pdfBytes = await doc.save();

    return new NextResponse(pdfBytes, {
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
