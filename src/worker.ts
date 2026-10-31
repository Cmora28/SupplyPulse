import "dotenv/config";
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { startOfWeek } from "date-fns";
import { generateSupplierReport } from "./lib/perplexity";
import { generateReportPDF } from "./lib/pdf-generator";
import { sendWeeklyReport } from "./lib/email";
import { TIER_MODEL } from "./lib/tier-limits";
import { loadWeeklySignals } from "./lib/collected-signals";
import { runDailySupplierNews } from "./lib/daily-news";
import { createPrismaDailyNewsStore } from "./lib/daily-news-store";
import { calculateNextReportAt } from "./lib/schedule";
import { AuditAction, type SubscriptionTier } from "@prisma/client";
import { logAudit } from "./lib/audit";

// ---- Redis Connection ----
const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

const prisma = new PrismaClient();

// ---- Queue Definitions ----
const supplierReportQueue = new Queue("supplier-report", { connection });
const finalizerQueue = new Queue("report-finalizer", { connection });
const schedulerQueue = new Queue("weekly-scheduler", { connection });
const dailyNewsQueue = new Queue("daily-supplier-news", { connection });

// ---- Utility: Get Monday of current week at midnight UTC ----
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// ---- Worker 1: Distributed Scheduler (runs every 15 min) ----
const schedulerWorker = new Worker(
  "weekly-scheduler",
  async () => {
    const now = new Date();
    console.log(`[Scheduler] Checking for due reports at ${now.toISOString()}...`);

    // Find all users whose nextReportAt has passed and who have at least one supplier
    const dueUsers = await prisma.user.findMany({
      where: {
        nextReportAt: { lte: now },
        suppliers: { some: {} },
      },
      include: {
        suppliers: true,
      },
    });

    if (dueUsers.length === 0) {
      console.log("[Scheduler] No users due for reports");
      return;
    }

    console.log(`[Scheduler] Found ${dueUsers.length} user(s) due for reports`);

    for (const user of dueUsers) {
      const weekOf = getCurrentWeekMonday();

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

      // Advance nextReportAt by 7 days from the current scheduled time (not from now)
      const currentNext = user.nextReportAt || now;
      const reportDay = (user as unknown as { reportDay?: number }).reportDay ?? 1;
      const reportHour = (user as unknown as { reportHour?: number }).reportHour ?? 8;
      const newNextReportAt = calculateNextReportAt(reportDay, reportHour, currentNext);

      await prisma.user.update({
        where: { id: user.id },
        data: { nextReportAt: newNextReportAt },
      });

      void logAudit({
        action: AuditAction.REPORT_TRIGGER_SCHEDULED,
        actorUserId: user.id,
        actorEmail: user.email,
        targetType: "ReportRun",
        targetId: reportRun.id,
        metadata: {
          supplierCount: user.suppliers.length,
          weekOf: weekOf.toISOString(),
        },
      });

      console.log(
        `[Scheduler] Created run ${reportRun.id} with ${user.suppliers.length} items for ${user.email}. Next run: ${newNextReportAt.toISOString()}`
      );
    }

    console.log(`[Scheduler] Processed ${dueUsers.length} user(s)`);
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
        reportRun: {
          include: { user: true },
        },
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
      // Select AI model based on user's subscription tier
      const userTier = item.reportRun.user.subscriptionTier as SubscriptionTier;
      const model = TIER_MODEL[userTier] || "sonar-pro";
      const userLocale = (item.reportRun.user as unknown as { locale?: string }).locale || "en";
      console.log(`[ReportWorker] User tier: ${userTier}, model: ${model}, locale: ${userLocale}`);

      let signals: Awaited<ReturnType<typeof loadWeeklySignals>> = [];
      try {
        signals = await loadWeeklySignals(prisma, item.supplier);
      } catch (signalError) {
        const message = signalError instanceof Error ? signalError.message : String(signalError);
        console.warn(
          `[ReportWorker] Collected signals unavailable, continuing weekly report: ${message}`
        );
      }

      const { content, citations } = await generateSupplierReport(
        item.supplier,
        model,
        userLocale,
        signals
      );
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
    console.log(`[Finalizer] Processing run ${reportRunId} (job ${job.id})`);

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

    const userLocale = (reportRun.user as unknown as { locale?: string }).locale || "en";
    console.log(`[Finalizer] Generating PDF with ${supplierReports.length} reports (locale: ${userLocale})...`);
    const pdfBuffer = await generateReportPDF(
      reportRun.user,
      supplierReports,
      reportRun.weekOf,
      userLocale
    );

    let emailSent = false;
    if (reportRun.user.emailNotifications) {
      try {
        console.log(`[Finalizer] Sending email to ${reportRun.user.email}...`);
        await sendWeeklyReport(
          reportRun.user,
          pdfBuffer,
          reportRun.weekOf,
          supplierReports.length,
          userLocale
        );
        emailSent = true;
        console.log(`[Finalizer] Email sent successfully to ${reportRun.user.email}`);
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        console.warn(`[Finalizer] Email failed (non-blocking): ${msg}`);
        console.warn("[Finalizer] Report will still be marked as READY for download.");
      }
    }

    await prisma.reportRun.update({
      where: { id: reportRunId },
      data: { status: emailSent ? "EMAILED" : "READY" },
    });

    void logAudit({
      action: AuditAction.REPORT_FINALIZED,
      actorUserId: reportRun.userId,
      actorEmail: reportRun.user.email,
      targetType: "ReportRun",
      targetId: reportRunId,
      metadata: {
        status: emailSent ? "EMAILED" : "READY",
        supplierReportCount: supplierReports.length,
        weekOf: reportRun.weekOf.toISOString(),
      },
    });

    if (emailSent) {
      void logAudit({
        action: AuditAction.REPORT_EMAIL_SENT,
        actorUserId: reportRun.userId,
        actorEmail: reportRun.user.email,
        targetType: "ReportRun",
        targetId: reportRunId,
        metadata: { weekOf: reportRun.weekOf.toISOString() },
      });
    }

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

// ---- Worker 4: Daily supplier news (RSS/GDELT + JEV, no weekly-report LLM) ----
const dailyNewsWorker = new Worker(
  "daily-supplier-news",
  async () => {
    console.log("[DailyNews] Starting daily supplier collection");
    const summary = await runDailySupplierNews({
      store: createPrismaDailyNewsStore(prisma),
    });
    console.log(
      `[DailyNews] Finished inserted=${summary.inserted} classified=${summary.classified} emails=${summary.emails} purged=${summary.purged}`
    );
  },
  { connection, concurrency: 1 }
);

// ---- Setup repeatable cron job (every 15 minutes) ----
async function setupScheduler() {
  const existing = await schedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  await schedulerQueue.add(
    "distributed-schedule",
    {},
    {
      repeat: {
        pattern: "*/15 * * * *", // Every 15 minutes
      },
    }
  );

  console.log("[Setup] Distributed scheduler cron set: every 15 minutes");
}

// Daily collection at 06:00 UTC. Alert delivery still follows the plan cadence.
async function setupDailyNews() {
  const existing = await dailyNewsQueue.getRepeatableJobs();
  for (const job of existing) {
    await dailyNewsQueue.removeRepeatableByKey(job.key);
  }

  await dailyNewsQueue.add(
    "daily-supplier-news",
    {},
    {
      attempts: 2,
      backoff: { type: "fixed", delay: 10 * 60 * 1000 },
      repeat: {
        pattern: "0 6 * * *",
      },
    }
  );

  console.log("[Setup] Daily supplier news cron set: 06:00 UTC");
}

// ---- Backfill: set nextReportAt for legacy users who don't have one ----
async function backfillSchedules() {
  const usersWithoutSchedule = await prisma.user.findMany({
    where: { nextReportAt: null },
  });

  if (usersWithoutSchedule.length === 0) {
    console.log("[Backfill] All users have nextReportAt set");
    return;
  }

  console.log(`[Backfill] Setting nextReportAt for ${usersWithoutSchedule.length} user(s)...`);

  for (const user of usersWithoutSchedule) {
    const reportDay = (user as unknown as { reportDay?: number }).reportDay ?? 1;
    const reportHour = (user as unknown as { reportHour?: number }).reportHour ?? 8;
    const nextReportAt = calculateNextReportAt(reportDay, reportHour);

    await prisma.user.update({
      where: { id: user.id },
      data: { nextReportAt },
    });

    console.log(`[Backfill] ${user.email}: next report at ${nextReportAt.toISOString()}`);
  }

  console.log("[Backfill] Complete");
}

// ---- Graceful Shutdown ----
async function shutdown() {
  console.log("[Shutdown] Gracefully shutting down workers...");

  await schedulerWorker.close();
  await reportWorker.close();
  await finalizerWorker.close();
  await dailyNewsWorker.close();
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

dailyNewsWorker.on("failed", (job, err) => {
  console.error(`[DailyNews] Job ${job?.id} failed:`, err.message);
});

// ---- Worker ready events ----
finalizerWorker.on("ready", () => {
  console.log("[Finalizer] Worker is READY and listening for jobs");
});

finalizerWorker.on("error", (err) => {
  console.error("[Finalizer] Worker ERROR:", err.message);
});

reportWorker.on("ready", () => {
  console.log("[ReportWorker] Worker is READY and listening for jobs");
});

// ---- Recovery: process stuck runs on startup ----
async function recoverStuckRuns() {
  // Find runs that are PROCESSING or FAILED but have successful items that weren't finalized
  const stuckRuns = await prisma.reportRun.findMany({
    where: {
      status: { in: ["PROCESSING", "FAILED"] },
      items: {
        some: { status: "SUCCESS" },
        none: { status: { in: ["PENDING", "PROCESSING"] } },
      },
    },
    include: {
      items: { select: { status: true, includedInPdf: true } },
    },
  });

  // Filter to only runs where successful items weren't included in PDF yet
  const needsFinalization = stuckRuns.filter((run) =>
    run.items.some((i) => i.status === "SUCCESS" && !i.includedInPdf)
  );

  if (needsFinalization.length > 0) {
    console.log(`[Recovery] Found ${needsFinalization.length} run(s) needing finalization...`);
    for (const run of needsFinalization) {
      // Reset status to PROCESSING so the finalizer can work on it
      await prisma.reportRun.update({
        where: { id: run.id },
        data: { status: "PROCESSING" },
      });

      await finalizerQueue.add(
        "finalize-report",
        { reportRunId: run.id },
        { attempts: 3, backoff: { type: "fixed", delay: 10000 } }
      );
      console.log(`[Recovery] Re-enqueued finalizer for run ${run.id}`);
    }
  } else {
    console.log("[Recovery] No stuck runs found");
  }
}

// ---- Start ----
console.log("=== Supply Pulse Worker Process ===");
console.log(
  "Workers started: scheduler (every 15 min), supplier-report, report-finalizer, daily-supplier-news (06:00 UTC)"
);
setupScheduler().catch(console.error);
setupDailyNews().catch(console.error);

// Give workers time to connect, then backfill schedules and recover stuck runs
setTimeout(async () => {
  try {
    await backfillSchedules();
  } catch (err) {
    console.error("[Backfill] Error:", err instanceof Error ? err.message : err);
  }
  try {
    await recoverStuckRuns();
  } catch (err) {
    console.error("[Recovery] Error:", err instanceof Error ? err.message : err);
  }
}, 5000);
