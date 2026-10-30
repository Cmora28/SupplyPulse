import PDFDocument from "pdfkit";
import type { Supplier, SupplierReport, User } from "@prisma/client";
import { format } from "date-fns";
import { createTranslator } from "@/i18n";

interface SupplierWithReport {
  supplier: Supplier;
  report: SupplierReport;
}

// Layout Constants
const MARGIN = 50;
const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FOOTER_Y = PAGE_HEIGHT - 40;
const HEADER_HEIGHT = 60; // For content pages

// Theme Colors (Matches globals.css HSL(221, 83%, 53%))
const COLORS = {
  primary: "#2563eb", // Vibrant Blue
  primaryDark: "#1e40af", // Darker Blue for headers
  primaryLight: "#dbeafe", // Very light blue for backgrounds
  accent: "#0f172a", // Slate 900
  text: "#334155", // Slate 700
  textDark: "#0f172a", // Slate 900
  textLight: "#64748b", // Slate 500
  border: "#e2e8f0", // Slate 200
  white: "#ffffff",
  success: "#16a34a",
  warning: "#ca8a04",
  danger: "#dc2626",
  link: "#2563eb",
  bgLight: "#f8fafc",
  coverBlue: "#60a5fa",
  coverSlate: "#0f172a",
};

const COVER_HEADER_HEIGHT = 300;

// ---- State Management ----
let generatedDate = "";
let tFunc: (key: string, params?: Record<string, string | number>) => string;

// ---- Text Processing Helpers ----

function stripMarkdown(text: string): string {
  let t = text;
  // Remove bold/italic markers but keep text
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/_([^_]+)_/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return t;
}

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "hr" }
  | { type: "bullet"; text: string }
  | { type: "numbered"; num: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blank" };

function parseContentToBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      blocks.push({ type: "blank" });
      continue;
    }
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push({ type: "hr" });
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      blocks.push({ type: "h4", text: stripMarkdown(trimmed.substring(5)) });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: stripMarkdown(trimmed.substring(4)) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: stripMarkdown(trimmed.substring(3)) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: stripMarkdown(trimmed.substring(2)) });
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bullet", text: stripMarkdown(trimmed.substring(2)) });
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      blocks.push({
        type: "numbered",
        num: numMatch[1],
        text: stripMarkdown(numMatch[2]),
      });
      continue;
    }
    blocks.push({ type: "paragraph", text: stripMarkdown(trimmed) });
  }
  return blocks;
}

// ---- Graphical Helpers ----

/** Site-style logo: blue rounded square + white pulse "S" */
function drawBrandLogo(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number
) {
  const radius = size * 0.25;
  doc.roundedRect(x, y, size, size, radius).fill(COLORS.primary);
  doc.save();
  doc.translate(x, y);
  const scale = size / 32;
  doc.scale(scale);
  doc
    .moveTo(21.76, 10.24)
    .bezierCurveTo(8.32, 10.24, 8.32, 16, 16, 16)
    .bezierCurveTo(23.68, 16, 23.68, 21.76, 10.24, 21.76)
    .lineWidth(3.84)
    .lineCap("round")
    .strokeColor(COLORS.white)
    .stroke();
  doc.restore();
}

function drawCoverGlobeWatermark(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  size: number
) {
  doc.save();
  doc.opacity(0.1);
  drawIcon(doc, "globe", cx - size / 2, cy - size / 2, size, COLORS.white);
  doc.opacity(1);
  doc.restore();
}

function drawCoverPageHeader(
  doc: PDFKit.PDFDocument,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  doc.rect(0, 0, PAGE_WIDTH, COVER_HEADER_HEIGHT).fill(COLORS.coverSlate);

  drawCoverGlobeWatermark(doc, PAGE_WIDTH - 100, COVER_HEADER_HEIGHT * 0.45, 220);

  const logoSize = 32;
  const left = MARGIN;
  drawBrandLogo(doc, left, 40, logoSize);

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(COLORS.textLight)
    .text(t("pdf.coverConfidential"), MARGIN, 44, {
      width: CONTENT_WIDTH,
      align: "right",
    });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(COLORS.coverBlue)
    .text(t("pdf.coverEyebrow").toUpperCase(), left, 88, {
      characterSpacing: 1.2,
    });

  const titleLine1 = t("pdf.coverTitle1");
  const titleLine2 = t("pdf.coverTitle2");
  doc.fontSize(30).font("Times-Bold").fillColor(COLORS.white);
  doc.text(titleLine1, left, 108, { width: CONTENT_WIDTH - 80 });
  doc.text(titleLine2, left, doc.y + 4, { width: CONTENT_WIDTH - 80 });
}

function drawLogo(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  doc.save();
  // Background Circle (Gradient-like effect by stacking)
  doc.circle(x + size / 2, y + size / 2, size / 2).fill(COLORS.white);

  // "S" Pulse Path
  // Simple stylized pulse/S shape
  const p = size * 0.2; // padding
  const w = size - 2 * p;
  const h = size - 2 * p;
  const sx = x + p;
  const sy = y + p;

  doc
    .moveTo(sx + w * 0.8, sy + h * 0.2)
    .bezierCurveTo(sx + w * 0.1, sy + h * 0.2, sx + w * 0.1, sy + h * 0.5, sx + w * 0.5, sy + h * 0.5)
    .bezierCurveTo(sx + w * 0.9, sy + h * 0.5, sx + w * 0.9, sy + h * 0.8, sx + w * 0.2, sy + h * 0.8)
    .lineWidth(size * 0.12)
    .lineCap("round")
    .strokeColor(COLORS.primary)
    .stroke();

  doc.restore();
}

// Simple icon drawer using paths
function drawIcon(doc: PDFKit.PDFDocument, type: "globe" | "tag" | "clock" | "chart", x: number, y: number, size: number, color: string) {
  doc.save().translate(x, y).scale(size / 24); // Normalize to 24px grid

  doc.fillColor(color);

  switch (type) {
    case "globe":
      doc.path("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-1.07 3.9-2.74 5.08z").fill();
      break;
    case "tag":
      doc.path("M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z").fill();
      break;
    case "clock":
      doc.path("M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z").fill();
      break;
    case "chart":
      doc.path("M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z").fill();
      break;
  }

  doc.restore();
}

// ---- PDF Page Helpers ----

function drawHeader(doc: PDFKit.PDFDocument) {
  // Only for content pages
  doc.save();
  // Header background (optional, keeping it clean for now)
  // doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT).fill(COLORS.primaryLight);

  // Logo small
  drawLogo(doc, MARGIN, 20, 24);

  // Title
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.textLight)
    .text("Supply Pulse", MARGIN + 32, 26);

  // Date right aligned
  doc.fontSize(9).font("Helvetica").fillColor(COLORS.textLight)
    .text(generatedDate, MARGIN, 26, { width: CONTENT_WIDTH, align: "right" });

  // Divider
  doc.moveTo(MARGIN, 50).lineTo(PAGE_WIDTH - MARGIN, 50).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  doc.restore();
}

function stampFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const savedY = doc.y;
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  // Divider
  doc
    .moveTo(MARGIN, FOOTER_Y - 10)
    .lineTo(PAGE_WIDTH - MARGIN, FOOTER_Y - 10)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // Confidential Text
  doc.fontSize(8).font("Helvetica").fillColor(COLORS.textLight)
    .text("Confidential - Generated by Supply Pulse AI", MARGIN, FOOTER_Y, {
      width: CONTENT_WIDTH / 2,
      lineBreak: false,
    });

  // Page Number
  if (pageNum > 0) { // Don't show on cover
    doc.text(`${tFunc("pdf.page", { num: pageNum })}`, MARGIN + CONTENT_WIDTH / 2, FOOTER_Y, {
      width: CONTENT_WIDTH / 2,
      align: "right",
      lineBreak: false,
    });
  }

  doc.page.margins.bottom = savedBottom;
  doc.y = savedY;
}

// ---- Block Renderers ----

function renderBlock(doc: PDFKit.PDFDocument, block: Block) {
  const checkSpace = (needed: number) => {
    if (doc.y + needed > PAGE_HEIGHT - MARGIN - 20) {
      doc.addPage();
      drawHeader(doc);
      doc.y = HEADER_HEIGHT + 20;
    }
  };

  switch (block.type) {
    case "blank":
      doc.y += 6;
      break;

    case "hr":
      checkSpace(20);
      doc.y += 10;
      doc
        .moveTo(MARGIN, doc.y)
        .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
      doc.y += 15;
      break;

    case "h1":
      checkSpace(40);
      doc.y += 15;
      doc.fontSize(18).font("Helvetica-Bold").fillColor(COLORS.primaryDark)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 5;
      break;

    case "h2":
      checkSpace(35);
      doc.y += 12;
      doc.fontSize(15).font("Helvetica-Bold").fillColor(COLORS.textDark)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 5;
      break;

    case "h3":
      checkSpace(30);
      doc.y += 10;
      doc.fontSize(13).font("Helvetica-Bold").fillColor(COLORS.textDark)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 4;
      break;

    case "h4":
      checkSpace(25);
      doc.y += 8;
      doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.text)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 3;
      break;

    case "bullet": {
      const h = doc.fontSize(10).font("Helvetica").heightOfString(block.text, { width: CONTENT_WIDTH - 20 });
      checkSpace(h + 8);
      const sy = doc.y;
      doc.circle(MARGIN + 6, sy + 6, 2).fill(COLORS.primary);
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, MARGIN + 18, sy, { width: CONTENT_WIDTH - 18, align: "justify" });
      doc.y += 6;
      break;
    }

    case "numbered": {
      const h = doc.fontSize(10).font("Helvetica").heightOfString(block.text, { width: CONTENT_WIDTH - 25 });
      checkSpace(h + 8);
      const sy = doc.y;
      doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text(`${block.num}.`, MARGIN + 4, sy, { width: 20, lineBreak: false });
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, MARGIN + 28, sy, { width: CONTENT_WIDTH - 28, align: "justify" });
      doc.y += 6;
      break;
    }

    case "paragraph": {
      const h = doc.fontSize(10).font("Helvetica").heightOfString(block.text, { width: CONTENT_WIDTH });
      checkSpace(h + 8);
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "justify", lineGap: 3 });
      doc.y += 8;
      break;
    }
  }
}

function drawRiskBanner(
  doc: PDFKit.PDFDocument,
  report: Pick<SupplierReport, "priority" | "riskScore" | "riskFactors">,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (!report.priority || report.riskScore == null) return;

  const factors = (report.riskFactors ?? []).map((factor) => factor.trim()).filter(Boolean).slice(0, 3);
  const factorLine = factors.length
    ? `${t("pdf.riskFactors")}: ${factors.join(" · ")}`
    : "";
  const innerWidth = CONTENT_WIDTH - 28;
  doc.font("Helvetica").fontSize(9);
  const factorHeight = factorLine
    ? doc.heightOfString(factorLine, { width: innerWidth })
    : 0;
  const bannerHeight = factorLine ? 38 + factorHeight : 32;

  if (doc.y + bannerHeight > PAGE_HEIGHT - MARGIN - 20) {
    doc.addPage();
    drawHeader(doc);
    doc.y = HEADER_HEIGHT + 20;
  }

  const top = doc.y;
  const color =
    report.priority === "P1"
      ? COLORS.danger
      : report.priority === "P2"
        ? COLORS.warning
        : COLORS.success;

  doc.save();
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, bannerHeight, 6).fillAndStroke(COLORS.bgLight, COLORS.border);
  doc.rect(MARGIN, top, 4, bannerHeight).fill(color);
  doc.restore();

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(color)
    .text(
      `${report.priority}    ${t("pdf.riskScore")}: ${t("pdf.riskScoreValue", { score: report.riskScore })}`,
      MARGIN + 14,
      top + 10,
      { width: innerWidth }
    );

  if (factorLine) {
    doc.fontSize(9).font("Helvetica").fillColor(COLORS.text).text(factorLine, MARGIN + 14, top + 28, {
      width: innerWidth,
    });
  }

  doc.y = top + bannerHeight + 14;
}

// ---- Main Generator ----

export async function generateReportPDF(
  user: Pick<User, "name" | "email">,
  supplierReports: SupplierWithReport[],
  weekOf: Date,
  locale: string = "en"
): Promise<Buffer> {
  const t = createTranslator(locale);

  return new Promise((resolve, reject) => {
    try {
      tFunc = t;
      generatedDate = format(new Date(), "MMMM d, yyyy");

      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        autoFirstPage: false,
        bufferPages: true, // Important: Enable bufferPages to support switching pages
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ============ COVER PAGE ============
      doc.addPage();

      drawCoverPageHeader(doc, t);

      // Info card overlapping header / body
      const cardY = 250;
      doc.roundedRect(MARGIN, cardY, CONTENT_WIDTH, 140, 8).fill(COLORS.white);
      // Shadow effect manually? PDFKit doesn't do shadows easily. The white card on blue/white split looks good.

      doc.fillColor(COLORS.text);
      doc.fontSize(10).font("Helvetica-Bold").text("PREPARED FOR", MARGIN + 30, cardY + 30);
      doc.fontSize(14).font("Helvetica").text(user.name || user.email, MARGIN + 30, cardY + 45);

      doc.fontSize(10).font("Helvetica-Bold").text("REPORT DATE", MARGIN + 30, cardY + 80);
      doc.fontSize(14).font("Helvetica").text(t("pdf.weekOf", { date: format(weekOf, "MMMM d, yyyy") }), MARGIN + 30, cardY + 95);

      doc.fontSize(10).font("Helvetica-Bold").text("SUPPLIERS ANALYZED", MARGIN + 300, cardY + 30);
      doc.fontSize(24).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text(String(supplierReports.length), MARGIN + 300, cardY + 45);

      // Bottom Branding
      doc.fontSize(10).font("Helvetica").fillColor(COLORS.textLight)
        .text(t("pdf.poweredBy"), 0, PAGE_HEIGHT - 80, { align: "center", width: PAGE_WIDTH });


      // ============ TABLE OF CONTENTS ============
      // If cover page overflowed, we might already be on page 2.
      if (doc.bufferedPageRange().count === 1) {
        doc.addPage();
      } else {
        // Auto-added page, just reset to top
        doc.switchToPage(1); // Ensure we are on the second page (index 1)
        doc.y = MARGIN;
      }
      const tocIndex = doc.bufferedPageRange().count - 1; // Capture the index of the TOC page
      
      doc.fontSize(24).font("Helvetica-Bold").fillColor(COLORS.textDark)
        .text(t("pdf.tableOfContents"), MARGIN, MARGIN + 40);
      
      doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).strokeColor(COLORS.primary).lineWidth(2).stroke();
      
      const tocStartY = doc.y + 40;
      
      // Map to store page number for each supplier
      const supplierPages: number[] = [];


      // ============ SUPPLIER REPORTS ============
      
      supplierReports.forEach((sr) => {
        doc.addPage();
        drawHeader(doc);
        doc.y = HEADER_HEIGHT + 30; // Start below header

        // Store current page number (1-based count)
        // doc.bufferedPageRange().count gives total pages.
        // The Cover is page 1. TOC is page 2. This is page 3+
        // Wait, standard page numbering usually starts after cover.
        // Let's say Cover is not numbered. TOC is i. Report is 1.
        // For simplicity: Sequential numbering from TOC = 1? 
        // Let's just use absolute page count for now.
        supplierPages.push(doc.bufferedPageRange().count);

        // Header Section
        doc.fontSize(22).font("Helvetica-Bold").fillColor(COLORS.primaryDark)
          .text(sr.supplier.name, MARGIN, doc.y);
        
        doc.y += 5;
        // Accent line
        doc.rect(MARGIN, doc.y, 60, 4).fill(COLORS.primary);
        doc.y += 20;

        // Metadata Grid (Card Style)
        const startCardY = doc.y;
        doc.roundedRect(MARGIN, startCardY, CONTENT_WIDTH, 70, 6)
           .fillAndStroke(COLORS.bgLight, COLORS.border);
        
        const colWidth = CONTENT_WIDTH / 4;
        const iconY = startCardY + 15;
        const labelY = iconY + 28;
        const valY = labelY + 12;

        // Col 1: Country
        drawIcon(doc, "globe", MARGIN + 20, iconY, 20, COLORS.primary);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.textLight)
           .text(t("pdf.country").toUpperCase(), MARGIN + 20, labelY);
        doc.fontSize(10).font("Helvetica").fillColor(COLORS.textDark)
           .text(sr.supplier.country, MARGIN + 20, valY, { width: colWidth - 20, lineBreak: false });

        // Col 2: Category
        drawIcon(doc, "tag", MARGIN + colWidth + 20, iconY, 20, COLORS.warning);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.textLight)
           .text(t("pdf.category").toUpperCase(), MARGIN + colWidth + 20, labelY);
        doc.fontSize(10).font("Helvetica").fillColor(COLORS.textDark)
           .text(sr.supplier.category, MARGIN + colWidth + 20, valY, { width: colWidth - 20, lineBreak: false });

        // Col 3: Lead Time
        drawIcon(doc, "clock", MARGIN + colWidth * 2 + 20, iconY, 20, COLORS.textLight);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.textLight)
           .text(t("pdf.leadTime").toUpperCase(), MARGIN + colWidth * 2 + 20, labelY);
        doc.fontSize(10).font("Helvetica").fillColor(COLORS.textDark)
           .text(t("pdf.leadTimeDays", { days: String(sr.supplier.leadTimeDays) }), MARGIN + colWidth * 2 + 20, valY, { width: colWidth - 20, lineBreak: false });

        // Col 4: COGS
        drawIcon(doc, "chart", MARGIN + colWidth * 3 + 20, iconY, 20, COLORS.success);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.textLight)
           .text(t("pdf.cogs").toUpperCase(), MARGIN + colWidth * 3 + 20, labelY);
        doc.fontSize(10).font("Helvetica").fillColor(COLORS.textDark)
           .text(`${sr.supplier.cogsPercentage}%`, MARGIN + colWidth * 3 + 20, valY, { width: colWidth - 20, lineBreak: false });

        doc.y = startCardY + 90;

        drawRiskBanner(doc, sr.report, t);

        // Content
        const blocks = parseContentToBlocks(sr.report.content);
        for (const block of blocks) {
          renderBlock(doc, block);
        }

        // Citations
        if (sr.report.citations && sr.report.citations.length > 0) {
          if (doc.y > PAGE_HEIGHT - MARGIN - 100) {
            doc.addPage();
            drawHeader(doc);
            doc.y = HEADER_HEIGHT + 20;
          } else {
            doc.y += 20;
          }

          doc.fontSize(12).font("Helvetica-Bold").fillColor(COLORS.primaryDark)
             .text(t("pdf.sources"), MARGIN, doc.y);
          doc.y += 5;
          doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + 40, doc.y).strokeColor(COLORS.border).stroke();
          doc.y += 10;

          sr.report.citations.forEach((citation, i) => {
            doc.fontSize(8).font("Helvetica").fillColor(COLORS.link)
               .text(`[${i + 1}] ${citation}`, MARGIN, doc.y, {
                 link: citation,
                 underline: true,
                 width: CONTENT_WIDTH
               });
            doc.y += 4;
          });
        }
      });

      // ============ POPULATE TOC ============
      // Switch back to TOC page
      doc.switchToPage(tocIndex);
      doc.y = tocStartY;
      doc.fillColor(COLORS.textDark); // Reset color explicitly

      supplierReports.forEach((sr, i) => {
        const pageNum = supplierPages[i];
        
        // Dot leader
        const nameText = `${i + 1}. ${sr.supplier.name}`;
        const pageText = `Page ${pageNum}`;
        
        doc.fontSize(11).font("Helvetica").fillColor(COLORS.textDark)
           .text(nameText, MARGIN, doc.y, { continued: true });
        
        // Calculate dots width? Hard in pdfkit.
        // Simple align right approach
        doc.text(pageText, { align: "right" });
        
        // Underline or separator
        doc.y += 5;
        doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y)
           .strokeColor(COLORS.border).lineWidth(0.5).dash(2, { space: 2 }).stroke();
        doc.undash();
        doc.y += 15;
      });

      // ============ FOOTERS ============
      // Add footers to all pages except cover
      const range = doc.bufferedPageRange();
      for (let i = 1; i < range.count; i++) { // Skip 0 (Cover)
        doc.switchToPage(i);
        stampFooter(doc, i + 1); // Show page number (1-based)
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
