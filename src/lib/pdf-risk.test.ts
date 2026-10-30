import assert from "node:assert/strict";
import { inflateSync } from "zlib";
import { describe, it } from "node:test";
import type { Supplier, SupplierReport } from "@prisma/client";
import { generateReportPDF } from "./pdf-generator";

function pdfText(buf: Buffer): string {
  const raw = buf.toString("latin1");
  let combined = "";
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    const body = match[1];
    try {
      combined += inflateSync(Buffer.from(body, "latin1")).toString("latin1");
    } catch {
      combined += body;
    }
  }
  return [...combined.matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("");
}

const supplier: Supplier = {
  id: "supplier-1",
  userId: "user-1",
  name: "Acme Components",
  country: "China",
  category: "Electronics",
  leadTimeDays: 30,
  cogsPercentage: 22,
  shippingRoute: "Shanghai → Rotterdam",
  dependencies: null,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
};

function report(overrides: Partial<SupplierReport> = {}): SupplierReport {
  return {
    id: "report-1",
    supplierId: supplier.id,
    content: "## 1. Executive Summary\n\n- Overall priority this week: P3.\n",
    citations: ["https://example.com/source"],
    riskScore: null,
    priority: null,
    riskFactors: [],
    p1AlertSentAt: null,
    weekOf: new Date("2026-10-26T00:00:00.000Z"),
    generatedAt: new Date("2026-10-27T00:00:00.000Z"),
    ...overrides,
  };
}

describe("generateReportPDF risk banner", () => {
  it("renders unscored historical reports and scored reports", async () => {
    const weekOf = new Date("2026-10-26T00:00:00.000Z");
    const user = { name: "Ada", email: "ada@example.com" };

    const plain = await generateReportPDF(
      user,
      [{ supplier, report: report() }],
      weekOf,
      "en"
    );
    const scored = await generateReportPDF(
      user,
      [
        {
          supplier,
          report: report({
            priority: "P1",
            riskScore: 88,
            riskFactors: ["Port closure", "Export license delay"],
          }),
        },
      ],
      weekOf,
      "en"
    );

    assert.equal(plain.subarray(0, 4).toString(), "%PDF");
    assert.equal(scored.subarray(0, 4).toString(), "%PDF");
    const scoredText = pdfText(scored);
    const plainText = pdfText(plain);
    assert.match(scoredText, /P1\s+Risk score:\s*88\/100/);
    assert.match(scoredText, /Port closure/);
    assert.equal(plainText.includes("88/100"), false);
    assert.equal(plainText.includes("Risk score:"), false);
  });
});
