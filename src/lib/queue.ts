import { Queue } from "bullmq";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export const schedulerQueue = new Queue("weekly-scheduler", { connection });
export const supplierReportQueue = new Queue("supplier-report", { connection });
export const finalizerQueue = new Queue("report-finalizer", { connection });
export const dailyNewsQueue = new Queue("daily-supplier-news", { connection });
