import "dotenv/config";
import fs from "fs";
import path from "path";
import { startOfWeek } from "date-fns";
import type { Supplier } from "@prisma/client";
import { generateSupplierReport } from "../src/lib/perplexity";
import { generateReportPDF } from "../src/lib/pdf-generator";

const sampleSupplier: Supplier = {
  id: "sample-supplier-id",
  userId: "sample-user-id",
  name: "Shenzhen Apex Components Ltd",
  country: "China",
  category: "Electronic components",
  leadTimeDays: 45,
  cogsPercentage: 28,
  shippingRoute: "Shanghai → Rotterdam → US distribution",
  dependencies: "Semiconductor fabs in Taiwan; Ningbo port congestion sensitivity",
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.error("PERPLEXITY_API_KEY is not set in .env");
    process.exit(1);
  }

  const locale = process.env.SAMPLE_REPORT_LOCALE || "en";
  const model = process.env.SAMPLE_REPORT_MODEL || "sonar-deep-research";

  console.log(`Generating AI report (${model}, locale=${locale})...`);
  const { content, citations } = await generateSupplierReport(
    sampleSupplier,
    model,
    locale
  );

  const weekOf = startOfWeek(new Date(), { weekStartsOn: 1 });
  weekOf.setUTCHours(0, 0, 0, 0);

  console.log("Building PDF...");
  const pdf = await generateReportPDF(
    { name: "Sample Procurement Team", email: "demo@supplypulse.net" },
    [
      {
        supplier: sampleSupplier,
        report: {
          id: "sample-report-id",
          supplierId: sampleSupplier.id,
          content,
          citations,
          weekOf,
          generatedAt: new Date(),
        },
      },
    ],
    weekOf,
    locale
  );

  const outDir = path.join(process.cwd(), "public");
  const generatedPath = path.join(outDir, "supply-chain-report-sample-generated.pdf");
  const landingPath = path.join(outDir, "supply-chain-report-example.pdf");
  const mdPath = path.join(outDir, "sample-report-content.md");

  fs.writeFileSync(generatedPath, pdf);
  fs.writeFileSync(landingPath, pdf);
  fs.writeFileSync(
    mdPath,
    `# Sample report markdown\n\n${content}\n\n## Citations\n\n${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`
  );

  console.log(`PDF (generated): ${generatedPath} (${pdf.length} bytes)`);
  console.log(`PDF (landing): ${landingPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
