import PDFDocument from "pdfkit";
import type { Supplier, SupplierReport, User } from "@prisma/client";
import { format } from "date-fns";

interface SupplierWithReport {
  supplier: Supplier;
  report: SupplierReport;
}

const MARGIN = 50;
const PAGE_WIDTH = 612; // Letter size
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: "#2563eb",
  text: "#111827",
  muted: "#6b7280",
  link: "#2563eb",
  border: "#e5e7eb",
};

function addPageFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  const y = PAGE_HEIGHT - 30;
  doc
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      `Page ${pageNum} of ${totalPages}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH, align: "right" }
    )
    .text(
      `Generated ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH, align: "left" }
    );
}

function parseMarkdownLine(
  doc: PDFKit.PDFDocument,
  line: string,
  x: number,
  maxWidth: number
) {
  const trimmed = line.trim();

  if (!trimmed) {
    doc.moveDown(0.3);
    return;
  }

  // H1 headers
  if (trimmed.startsWith("# ")) {
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(COLORS.text)
      .text(trimmed.substring(2), x, undefined, { width: maxWidth });
    doc.moveDown(0.3);
    return;
  }

  // H2 headers
  if (trimmed.startsWith("## ")) {
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(COLORS.text)
      .text(trimmed.substring(3), x, undefined, { width: maxWidth });
    doc.moveDown(0.3);
    return;
  }

  // H3 headers
  if (trimmed.startsWith("### ")) {
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(COLORS.text)
      .text(trimmed.substring(4), x, undefined, { width: maxWidth });
    doc.moveDown(0.2);
    return;
  }

  // Bullet points
  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
    const bulletText = trimmed.substring(2);
    const indent = 15;

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(COLORS.text);

    // Draw bullet
    doc.text("•", x + indent, undefined, { continued: true, width: 10 });
    doc.text(` ${bulletText}`, { width: maxWidth - indent - 10 });
    doc.moveDown(0.1);
    return;
  }

  // Numbered lists
  const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)/);
  if (numberedMatch) {
    const indent = 15;
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor(COLORS.text)
      .text(`${numberedMatch[1]}.`, x + indent, undefined, {
        continued: true,
        width: 20,
      })
      .text(` ${numberedMatch[2]}`, { width: maxWidth - indent - 20 });
    doc.moveDown(0.1);
    return;
  }

  // Bold text within **...**
  if (trimmed.includes("**")) {
    const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
    let first = true;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      const isBold = i % 2 === 1;
      const isLast = i === parts.length - 1;

      doc.fontSize(11).font(isBold ? "Helvetica-Bold" : "Helvetica").fillColor(COLORS.text);

      if (first) {
        doc.text(part, x, undefined, {
          continued: !isLast,
          width: maxWidth,
        });
        first = false;
      } else {
        doc.text(part, {
          continued: !isLast,
          width: maxWidth,
        });
      }
    }
    doc.moveDown(0.1);
    return;
  }

  // Regular paragraph
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor(COLORS.text)
    .text(trimmed, x, undefined, { width: maxWidth });
  doc.moveDown(0.1);
}

export async function generateReportPDF(
  user: Pick<User, "name" | "email">,
  supplierReports: SupplierWithReport[],
  weekOf: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ---- COVER PAGE ----
      doc.moveDown(8);
      doc
        .fontSize(28)
        .font("Helvetica-Bold")
        .fillColor(COLORS.primary)
        .text("Supply Chain Risk Analysis", MARGIN, undefined, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      doc.moveDown(0.5);
      doc
        .fontSize(16)
        .font("Helvetica")
        .fillColor(COLORS.muted)
        .text(user.name || user.email, MARGIN, undefined, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .fillColor(COLORS.text)
        .text(
          `Week of ${format(weekOf, "MMMM d, yyyy")}`,
          MARGIN,
          undefined,
          { width: CONTENT_WIDTH, align: "center" }
        );

      doc.moveDown(1);
      doc
        .fontSize(12)
        .fillColor(COLORS.muted)
        .text(
          `${supplierReports.length} supplier${supplierReports.length !== 1 ? "s" : ""} analyzed`,
          MARGIN,
          undefined,
          { width: CONTENT_WIDTH, align: "center" }
        );

      doc.moveDown(8);
      doc
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text("Powered by Perplexity AI Deep Research", MARGIN, undefined, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      // ---- TABLE OF CONTENTS ----
      doc.addPage();
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor(COLORS.text)
        .text("Table of Contents", MARGIN, MARGIN);

      doc.moveDown(1);

      supplierReports.forEach((sr, index) => {
        doc
          .fontSize(12)
          .font("Helvetica")
          .fillColor(COLORS.primary)
          .text(`${index + 1}. ${sr.supplier.name}`, MARGIN + 20, undefined, {
            width: CONTENT_WIDTH - 20,
          });
        doc.moveDown(0.3);
      });

      // ---- SUPPLIER SECTIONS ----
      supplierReports.forEach((sr, index) => {
        doc.addPage();

        // Section header
        doc
          .fontSize(20)
          .font("Helvetica-Bold")
          .fillColor(COLORS.primary)
          .text(`${index + 1}. ${sr.supplier.name}`, MARGIN, MARGIN);

        doc.moveDown(0.5);

        // Profile box
        const boxY = doc.y;
        doc
          .roundedRect(MARGIN, boxY, CONTENT_WIDTH, 110, 5)
          .fillAndStroke("#f8fafc", COLORS.border);

        const profileItems = [
          ["Country", sr.supplier.country],
          ["Category", sr.supplier.category],
          ["Lead Time", `${sr.supplier.leadTimeDays} days`],
          ["COGS", `${sr.supplier.cogsPercentage}%`],
        ];

        if (sr.supplier.shippingRoute) {
          profileItems.push(["Shipping Route", sr.supplier.shippingRoute]);
        }

        let profileY = boxY + 12;
        const colWidth = CONTENT_WIDTH / 2 - 20;

        profileItems.forEach((item, i) => {
          const col = i % 2;
          const xPos = MARGIN + 15 + col * (colWidth + 20);

          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(COLORS.muted)
            .text(item[0], xPos, profileY);

          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor(COLORS.text)
            .text(item[1], xPos, profileY + 11, { width: colWidth });

          if (col === 1 || i === profileItems.length - 1) {
            profileY += 28;
          }
        });

        doc.y = boxY + 120;

        // Report content
        const lines = sr.report.content.split("\n");
        for (const line of lines) {
          // Check if we need a new page
          if (doc.y > PAGE_HEIGHT - MARGIN - 60) {
            doc.addPage();
          }
          parseMarkdownLine(doc, line, MARGIN, CONTENT_WIDTH);
        }

        // Citations
        if (sr.report.citations && sr.report.citations.length > 0) {
          doc.moveDown(1);
          if (doc.y > PAGE_HEIGHT - MARGIN - 100) {
            doc.addPage();
          }

          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor(COLORS.text)
            .text("Sources", MARGIN);

          doc.moveDown(0.3);

          sr.report.citations.forEach((citation, citIndex) => {
            if (doc.y > PAGE_HEIGHT - MARGIN - 30) {
              doc.addPage();
            }
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor(COLORS.link)
              .text(`${citIndex + 1}. ${citation}`, MARGIN + 10, undefined, {
                width: CONTENT_WIDTH - 10,
                link: citation,
                underline: true,
              });
            doc.moveDown(0.1);
          });
        }
      });

      // Add page numbers to all pages
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        addPageFooter(doc, i + 1, totalPages);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
