import PDFDocument from "pdfkit";
import type { Supplier, SupplierReport, User } from "@prisma/client";
import { format } from "date-fns";

interface SupplierWithReport {
  supplier: Supplier;
  report: SupplierReport;
}

const MARGIN = 54;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const FOOTER_Y = PAGE_HEIGHT - 40;
const USABLE_BOTTOM = FOOTER_Y - 8;

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  accent: "#0f172a",
  text: "#1e293b",
  textLight: "#475569",
  muted: "#94a3b8",
  link: "#2563eb",
  border: "#cbd5e1",
  bgLight: "#f1f5f9",
  white: "#ffffff",
};

// ---- State ----
let pageNum = 0;
let generatedDate = "";

// ---- Text Preprocessing ----

function stripMarkdown(text: string): string {
  let t = text;
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
      blocks.push({ type: "numbered", num: numMatch[1], text: stripMarkdown(numMatch[2]) });
      continue;
    }
    blocks.push({ type: "paragraph", text: stripMarkdown(trimmed) });
  }
  return blocks;
}

// ---- PDF Page Helpers ----

function stampFooter(doc: PDFKit.PDFDocument) {
  const savedY = doc.y;
  // Temporarily remove bottom margin so PDFKit doesn't auto-paginate
  // when writing text below the normal content area
  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  // Thin line above footer
  doc
    .moveTo(MARGIN, FOOTER_Y - 4)
    .lineTo(MARGIN + CONTENT_WIDTH, FOOTER_Y - 4)
    .strokeColor(COLORS.border)
    .lineWidth(0.3)
    .stroke();

  doc.fontSize(7).font("Helvetica").fillColor(COLORS.muted);
  doc.text(generatedDate, MARGIN, FOOTER_Y, {
    width: CONTENT_WIDTH / 2,
    lineBreak: false,
  });
  doc.text(`Page ${pageNum}`, MARGIN + CONTENT_WIDTH / 2, FOOTER_Y, {
    width: CONTENT_WIDTH / 2,
    align: "right",
    lineBreak: false,
  });

  // Restore margins and Y position
  doc.page.margins.bottom = savedBottom;
  doc.y = savedY;
}

function newPage(doc: PDFKit.PDFDocument) {
  // Stamp footer on current page before moving to next
  if (pageNum > 0) {
    stampFooter(doc);
  }
  doc.addPage();
  pageNum++;
  doc.y = MARGIN;
}

function checkSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > USABLE_BOTTOM) {
    newPage(doc);
  }
}

// ---- Block Renderers ----

function renderBlock(doc: PDFKit.PDFDocument, block: Block) {
  switch (block.type) {
    case "blank":
      doc.y += 4;
      break;

    case "hr":
      checkSpace(doc, 16);
      doc.y += 6;
      doc
        .moveTo(MARGIN, doc.y)
        .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
      doc.y += 10;
      break;

    case "h1":
      checkSpace(doc, 32);
      doc.y += 8;
      doc.fontSize(16).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 2;
      // Accent underline
      doc
        .moveTo(MARGIN, doc.y)
        .lineTo(MARGIN + 60, doc.y)
        .strokeColor(COLORS.primaryLight)
        .lineWidth(1.5)
        .stroke();
      doc.y += 6;
      break;

    case "h2":
      checkSpace(doc, 28);
      doc.y += 6;
      doc.fontSize(13).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 4;
      break;

    case "h3":
      checkSpace(doc, 24);
      doc.y += 5;
      doc.fontSize(11.5).font("Helvetica-Bold").fillColor(COLORS.accent)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 3;
      break;

    case "h4":
      checkSpace(doc, 20);
      doc.y += 4;
      doc.fontSize(10.5).font("Helvetica-Bold").fillColor(COLORS.text)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 2;
      break;

    case "bullet": {
      const indent = 12;
      const bulletW = 8;
      const textX = MARGIN + indent + bulletW;
      const textW = CONTENT_WIDTH - indent - bulletW;

      const h = doc.fontSize(9.5).font("Helvetica").heightOfString(block.text, { width: textW });
      checkSpace(doc, h + 5);

      const sy = doc.y;
      // Small filled circle as bullet
      doc.circle(MARGIN + indent + 2.5, sy + 5, 1.8).fill(COLORS.textLight);
      doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, textX, sy, { width: textW });
      doc.y += 2;
      break;
    }

    case "numbered": {
      const indent = 12;
      const numW = 16;
      const textX = MARGIN + indent + numW;
      const textW = CONTENT_WIDTH - indent - numW;

      const h = doc.fontSize(9.5).font("Helvetica").heightOfString(block.text, { width: textW });
      checkSpace(doc, h + 5);

      const sy = doc.y;
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor(COLORS.primaryLight)
        .text(`${block.num}.`, MARGIN + indent, sy, { width: numW, lineBreak: false });
      doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, textX, sy, { width: textW });
      doc.y += 2;
      break;
    }

    case "paragraph": {
      const h = doc.fontSize(9.5).font("Helvetica").heightOfString(block.text, { width: CONTENT_WIDTH });
      checkSpace(doc, h + 3);
      doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text)
        .text(block.text, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 1.5 });
      doc.y += 2;
      break;
    }
  }
}

// ---- Main Generator ----

export async function generateReportPDF(
  user: Pick<User, "name" | "email">,
  supplierReports: SupplierWithReport[],
  weekOf: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Reset state
      pageNum = 0;
      generatedDate = `Generated ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`;

      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ============ COVER PAGE ============
      doc.addPage();
      pageNum++;

      // Top accent bar
      doc.rect(0, 0, PAGE_WIDTH, 6).fill(COLORS.primary);

      // Title block
      doc.y = MARGIN + 160;
      doc.fontSize(32).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text("Supply Chain", MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
      doc.fontSize(32).font("Helvetica-Bold").fillColor(COLORS.primary)
        .text("Risk Analysis", MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });

      doc.y += 16;

      // Decorative line
      const lineCenter = PAGE_WIDTH / 2;
      doc
        .moveTo(lineCenter - 40, doc.y)
        .lineTo(lineCenter + 40, doc.y)
        .strokeColor(COLORS.primaryLight)
        .lineWidth(2)
        .stroke();
      doc.y += 20;

      doc.fontSize(14).font("Helvetica").fillColor(COLORS.textLight)
        .text(user.name || user.email, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
      doc.y += 8;
      doc.fontSize(13).font("Helvetica").fillColor(COLORS.text)
        .text(`Week of ${format(weekOf, "MMMM d, yyyy")}`, MARGIN, doc.y, {
          width: CONTENT_WIDTH, align: "center",
        });
      doc.y += 20;
      doc.fontSize(11).font("Helvetica").fillColor(COLORS.muted)
        .text(
          `${supplierReports.length} supplier${supplierReports.length !== 1 ? "s" : ""} analyzed`,
          MARGIN, doc.y,
          { width: CONTENT_WIDTH, align: "center" }
        );

      // Bottom branding
      doc.fontSize(9).font("Helvetica").fillColor(COLORS.muted)
        .text("Powered by Supply Pulse AI", MARGIN, PAGE_HEIGHT - 80, {
          width: CONTENT_WIDTH, align: "center",
        });

      stampFooter(doc);

      // ============ TABLE OF CONTENTS ============
      newPage(doc);

      doc.fontSize(20).font("Helvetica-Bold").fillColor(COLORS.accent)
        .text("Table of Contents", MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.y += 4;
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + 50, doc.y)
        .strokeColor(COLORS.primaryLight).lineWidth(1.5).stroke();
      doc.y += 16;

      supplierReports.forEach((sr, index) => {
        const numText = `${index + 1}`;
        doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.primaryLight)
          .text(numText, MARGIN + 8, doc.y, { width: 16, lineBreak: false });
        doc.fontSize(11).font("Helvetica").fillColor(COLORS.text)
          .text(sr.supplier.name, MARGIN + 26, doc.y, { width: CONTENT_WIDTH - 26 });
        doc.y += 4;
      });

      // ============ SUPPLIER SECTIONS ============
      supplierReports.forEach((sr, index) => {
        newPage(doc);

        // Section header with accent
        doc.rect(MARGIN, doc.y, 4, 22).fill(COLORS.primary);
        doc.fontSize(18).font("Helvetica-Bold").fillColor(COLORS.accent)
          .text(`${index + 1}. ${sr.supplier.name}`, MARGIN + 14, doc.y + 1, { width: CONTENT_WIDTH - 14 });
        doc.y += 30;

        // ---- Profile card ----
        const profileItems: [string, string][] = [
          ["Country", sr.supplier.country],
          ["Category", sr.supplier.category],
          ["Lead Time", `${sr.supplier.leadTimeDays} days`],
          ["COGS", `${sr.supplier.cogsPercentage}%`],
        ];
        if (sr.supplier.shippingRoute) {
          profileItems.push(["Shipping Route", sr.supplier.shippingRoute]);
        }
        if (sr.supplier.dependencies) {
          profileItems.push(["Dependencies", sr.supplier.dependencies]);
        }

        const rows = Math.ceil(profileItems.length / 2);
        const boxHeight = rows * 30 + 14;
        const boxY = doc.y;

        // Card background
        doc.roundedRect(MARGIN, boxY, CONTENT_WIDTH, boxHeight, 4)
          .fillAndStroke(COLORS.bgLight, COLORS.border);

        // Left accent bar on card
        doc.rect(MARGIN, boxY, 3, boxHeight).fill(COLORS.primaryLight);

        let py = boxY + 8;
        const colWidth = (CONTENT_WIDTH - 30) / 2;

        profileItems.forEach((item, i) => {
          const col = i % 2;
          const xPos = MARGIN + 14 + col * (colWidth + 10);

          doc.fontSize(7.5).font("Helvetica-Bold").fillColor(COLORS.muted)
            .text(item[0].toUpperCase(), xPos, py, { width: colWidth, lineBreak: false });
          doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.text)
            .text(item[1], xPos, py + 9, { width: colWidth, lineBreak: false });

          if (col === 1 || i === profileItems.length - 1) {
            py += 30;
          }
        });

        doc.y = boxY + boxHeight + 14;

        // ---- Report content ----
        const blocks = parseContentToBlocks(sr.report.content);
        for (const block of blocks) {
          renderBlock(doc, block);
        }

        // ---- Citations ----
        if (sr.report.citations && sr.report.citations.length > 0) {
          doc.y += 10;
          checkSpace(doc, 30);

          doc.fontSize(12).font("Helvetica-Bold").fillColor(COLORS.accent)
            .text("Sources", MARGIN, doc.y, { width: CONTENT_WIDTH });
          doc.y += 2;
          doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + 35, doc.y)
            .strokeColor(COLORS.primaryLight).lineWidth(1).stroke();
          doc.y += 6;

          sr.report.citations.forEach((citation, citIndex) => {
            checkSpace(doc, 12);
            doc.fontSize(7.5).font("Helvetica").fillColor(COLORS.link)
              .text(`[${citIndex + 1}] ${citation}`, MARGIN + 6, doc.y, {
                width: CONTENT_WIDTH - 6,
                link: citation,
                underline: true,
              });
            doc.y += 1;
          });
        }
      });

      // Stamp footer on the final page
      stampFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
