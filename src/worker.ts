import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { startOfWeek, format } from "date-fns";
import { generateSupplierReport } from "./lib/perplexity";
import { generateReportPDF } from "./lib/pdf-generator";
import { sendWeeklyReport } from "./lib/email";

// ---- Redis Connection ----
const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

const prisma = new PrismaClient();

// ---- Queue Definitions ----
const supplierReportQueue = new Queue("supplier-report", { connection });
const finalizerQueue = new Queue("report-finalizer", { connection });
const schedulerQueue = new Queue("weekly-scheduler", { connection });

// ---- Utility: Get Monday of current week at midnight UTC ----
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// ---- Worker 1: Weekly Scheduler ----
const schedulerWorker = new Worker(
  "weekly-scheduler",
  async () => {
    console.log("[Scheduler] Starting weekly report generation...");

    const weekOf = getCurrentWeekMonday();
    console.log(`[Scheduler] Week of: ${format(weekOf, "yyyy-MM-dd")}`);

    const users = await prisma.user.findMany({
      where: {
        suppliers: { some: {} },
      },
      include: {
        suppliers: true,
      },
    });

    console.log(`[Scheduler] Found ${users.length} users with suppliers`);

    for (const user of users) {
      const reportRun = await prisma.reportRun.create({
        data: {
          userId: user.id,
          weekOf,
          status: "PENDING",
        },
      });

      for (const supplier of user.suppliers) {
        const item = await prisma.reportRunItem.create({
          data: {
            reportRunId: reportRun.id,
            supplierId: supplier.id,
            status: "PENDING",
          },
        });

        await supplierReportQueue.add(
          "generate-report",
          { reportRunItemId: item.id },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 30000,
            },
          }
        );
      }

      console.log(
        `[Scheduler] Created run ${reportRun.id} with ${user.suppliers.length} items for user ${user.email}`
      );
    }

    console.log("[Scheduler] Weekly scheduling complete");
  },
  { connection, concurrency: 1 }
);

// ---- Worker 2: Supplier Report Generator ----
const reportWorker = new Worker(
  "supplier-report",
  async (job) => {
    const { reportRunItemId } = job.data as { reportRunItemId: string };
    console.log(`[ReportWorker] Processing item ${reportRunItemId}`);

    const item = await prisma.reportRunItem.findUnique({
      where: { id: reportRunItemId },
      include: {
        supplier: true,
        reportRun: true,
      },
    });

    if (!item) {
      throw new Error(`ReportRunItem ${reportRunItemId} not found`);
    }

    await prisma.reportRunItem.update({
      where: { id: item.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    await prisma.reportRun.updateMany({
      where: { id: item.reportRunId, status: "PENDING" },
      data: { status: "PROCESSING" },
    });

    try {
      const { content, citations } = await generateSupplierReport(item.supplier);
      const weekOf = item.reportRun.weekOf;

      await prisma.supplierReport.upsert({
        where: {
          supplierId_weekOf: {
            supplierId: item.supplierId,
            weekOf,
          },
        },
        create: {
          supplierId: item.supplierId,
          content,
          citations,
          weekOf,
        },
        update: {
          content,
          citations,
          generatedAt: new Date(),
        },
      });

      await prisma.reportRunItem.update({
        where: { id: item.id },
        data: { status: "SUCCESS", finishedAt: new Date() },
      });

      console.log(
        `[ReportWorker] SUCCESS for supplier "${item.supplier.name}" (item ${item.id})`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.reportRunItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: errorMessage,
        },
      });

      console.error(
        `[ReportWorker] FAILED for supplier "${item.supplier.name}": ${errorMessage}`
      );
    }

    // ---- Completion Check ----
    const remainingCount = await prisma.reportRunItem.count({
      where: {
        reportRunId: item.reportRunId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (remainingCount === 0) {
      console.log(
        `[ReportWorker] All items done for run ${item.reportRunId}, enqueueing finalizer`
      );
      await finalizerQueue.add(
        "finalize-report",
        { reportRunId: item.reportRunId },
        {
          attempts: 3,
          backoff: {
            type: "fixed",
            delay: 60000,
          },
        }
      );
    }
  },
  { connection, concurrency: 3 }
);

// ---- Worker 3: Report Finalizer ----
const finalizerWorker = new Worker(
  "report-finalizer",
  async (job) => {
    const { reportRunId } = job.data as { reportRunId: string };
    console.log(`[Finalizer] Processing run ${reportRunId}`);

    const reportRun = await prisma.reportRun.findUnique({
      where: { id: reportRunId },
      include: {
        user: true,
        items: {
          include: { supplier: true },
        },
      },
    });

    if (!reportRun) {
      throw new Error(`ReportRun ${reportRunId} not found`);
    }

    if (reportRun.status === "EMAILED" || reportRun.status === "READY") {
      console.log(`[Finalizer] Run ${reportRunId} already ${reportRun.status}, skipping`);
      return;
    }

    const successItems = reportRun.items.filter((i) => i.status === "SUCCESS");

    if (successItems.length === 0) {
      await prisma.reportRun.update({
        where: { id: reportRunId },
        data: { status: "FAILED" },
      });
      console.log(`[Finalizer] No successful items for run ${reportRunId}, marked FAILED`);
      return;
    }

    await prisma.reportRun.update({
      where: { id: reportRunId },
      data: { status: "PROCESSING" },
    });

    const supplierReports = await Promise.all(
      successItems.map(async (item) => {
        const report = await prisma.supplierReport.findUnique({
          where: {
            supplierId_weekOf: {
              supplierId: item.supplierId,
              weekOf: reportRun.weekOf,
            },
          },
        });

        if (!report) {
          throw new Error(
            `SupplierReport not found for supplier ${item.supplierId}`
          );
        }

        return { supplier: item.supplier, report };
      })
    );

    console.log(`[Finalizer] Generating PDF with ${supplierReports.length} reports...`);
    const pdfBuffer = await generateReportPDF(
      reportRun.user,
      supplierReports,
      reportRun.weekOf
    );

    if (reportRun.user.emailNotifications) {
      console.log(`[Finalizer] Sending email to ${reportRun.user.email}...`);
      await sendWeeklyReport(
        reportRun.user,
        pdfBuffer,
        reportRun.weekOf,
        supplierReports.length
      );
    }

    await prisma.reportRun.update({
      where: { id: reportRunId },
      data: { status: reportRun.user.emailNotifications ? "EMAILED" : "READY" },
    });

    await prisma.reportRunItem.updateMany({
      where: {
        id: { in: successItems.map((i) => i.id) },
      },
      data: { includedInPdf: true },
    });

    console.log(
      `[Finalizer] Run ${reportRunId} complete. ${supplierReports.length} reports processed.`
    );
  },
  { connection, concurrency: 2 }
);

// ---- Setup repeatable cron job ----
async function setupScheduler() {
  const existing = await schedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  await schedulerQueue.add(
    "weekly-schedule",
    {},
    {
      repeat: {
        pattern: "0 8 * * 1",
      },
    }
  );

  console.log("[Setup] Cron job scheduled: Monday 8 AM UTC");
}

// ---- Graceful Shutdown ----
async function shutdown() {
  console.log("[Shutdown] Gracefully shutting down workers...");

  await schedulerWorker.close();
  await reportWorker.close();
  await finalizerWorker.close();
  await prisma.$disconnect();

  console.log("[Shutdown] All workers closed.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ---- Error Handlers ----
schedulerWorker.on("failed", (job, err) => {
  console.error(`[Scheduler] Job ${job?.id} failed:`, err.message);
});

reportWorker.on("failed", (job, err) => {
  console.error(`[ReportWorker] Job ${job?.id} failed:`, err.message);
});

finalizerWorker.on("failed", (job, err) => {
  console.error(`[Finalizer] Job ${job?.id} failed:`, err.message);
});

// ---- Start ----
console.log("=== Supply Pulse Worker Process ===");
console.log("Workers started: scheduler, supplier-report, report-finalizer");
setupScheduler().catch(console.error);
