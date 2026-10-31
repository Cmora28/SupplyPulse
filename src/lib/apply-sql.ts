import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Idempotent scripts applied by the worker before it accepts jobs and again
 * before the daily job runs. Keep news tables first. The admin column and the
 * nullable terms-acceptance columns are independent and must stay on this list.
 */
export const STARTUP_SQL_FILES = [
  "prisma/sql/20261031_news_items_supplier_alerts.sql",
  "prisma/sql/20261031_news_pipeline_audit.sql",
  "prisma/sql/20261031_user_is_admin.sql",
  "prisma/sql/20261031_user_terms_consent.sql",
] as const;

function prismaExecuteArgs(file: string): string[] {
  return ["db", "execute", "--file", file, "--schema", "prisma/schema.prisma"];
}

/**
 * Applies additive SQL with `prisma db execute` before workers are constructed.
 * Failures are logged and do not stop the worker: weekly reports must still
 * run if a script errors.
 */
export function applyStartupSqlSync(
  log: (message: string) => void = console.log
): void {
  if (!process.env.DATABASE_URL) {
    log("[Setup] DATABASE_URL is not set; skipping SQL apply");
    return;
  }

  const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  for (const file of STARTUP_SQL_FILES) {
    try {
      execFileSync(prismaBin, prismaExecuteArgs(file), {
        cwd: process.cwd(),
        env: process.env,
        timeout: 120_000,
        stdio: "pipe",
        maxBuffer: 1024 * 1024,
      });
      log(`[Setup] Applied ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[Setup] SQL apply failed for ${file}: ${message}`);
    }
  }
}

/**
 * Async apply used by the daily job so a long script does not need to share
 * the startup path. Failures are logged and do not stop the caller.
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
        prismaExecuteArgs(file),
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
