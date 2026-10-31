import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Idempotent scripts applied by the worker before the daily job runs. */
export const STARTUP_SQL_FILES = [
  "prisma/sql/20261031_news_items_supplier_alerts.sql",
  "prisma/sql/20261031_news_pipeline_audit.sql",
] as const;

/**
 * Applies additive SQL with `prisma db execute`. Failures are logged and do
 * not stop the worker: weekly reports must still run if a script errors.
 */
export async function applyStartupSql(
  log: (message: string) => void = console.log
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log("[Setup] DATABASE_URL is not set; skipping SQL apply");
    return;
  }

  const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  for (const file of STARTUP_SQL_FILES) {
    try {
      const { stdout, stderr } = await execFileAsync(
        prismaBin,
        ["db", "execute", "--file", file, "--schema", "prisma/schema.prisma"],
        { cwd: process.cwd(), env: process.env, timeout: 120_000, maxBuffer: 1024 * 1024 }
      );
      const note = `${stdout ?? ""} ${stderr ?? ""}`.trim();
      log(`[Setup] Applied ${file}${note ? `: ${note}` : ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[Setup] SQL apply failed for ${file}: ${message}`);
    }
  }
}
