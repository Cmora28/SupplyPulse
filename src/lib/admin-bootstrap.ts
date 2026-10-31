import type { PrismaClient } from "@prisma/client";

export type AdminGrantStatus = "granted" | "already" | "missing" | "skipped" | "invalid";

export type AdminGrantResult = {
  status: AdminGrantStatus;
  email?: string;
};

export type AdminGrantStore = {
  findUserByEmail(
    email: string
  ): Promise<{ id: string; email: string; isAdmin: boolean } | null>;
  grant(id: string): Promise<void>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lowercase. Returns null when the value is empty or not an email. */
export function normalizeAdminEmail(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 320) return null;
  return email;
}

export function prismaAdminGrantStore(db: PrismaClient): AdminGrantStore {
  return {
    async findUserByEmail(email) {
      return db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, isAdmin: true },
      });
    },
    async grant(id) {
      await db.user.update({
        where: { id },
        data: { isAdmin: true },
      });
    },
  };
}

/**
 * Sets isAdmin for an existing account. Does not create a user and does not
 * clear the flag on anyone else.
 */
export async function grantAdminByEmail(
  store: AdminGrantStore,
  email: string
): Promise<AdminGrantResult> {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return { status: "invalid" };

  const found = await store.findUserByEmail(normalized);
  if (!found) return { status: "missing", email: normalized };
  if (found.isAdmin) return { status: "already", email: found.email };

  await store.grant(found.id);
  return { status: "granted", email: found.email };
}

export async function grantAdminFromEnv(
  store: AdminGrantStore,
  env: NodeJS.ProcessEnv = process.env
): Promise<AdminGrantResult> {
  const raw = env.ADMIN_EMAIL;
  if (!raw?.trim()) return { status: "skipped" };
  return grantAdminByEmail(store, raw);
}

export function adminGrantLogLine(result: AdminGrantResult): string {
  switch (result.status) {
    case "skipped":
      return "[Admin] ADMIN_EMAIL is not set. Nobody was granted isAdmin. Set ADMIN_EMAIL to the current admin's email and restart the worker, or run: npm run admin:grant -- <email>";
    case "invalid":
      return "[Admin] ADMIN_EMAIL is set but is not a valid email. Nobody was granted isAdmin.";
    case "missing":
      return `[Admin] No user matches ${result.email}. They must register first, then restart the worker or run: npm run admin:grant -- ${result.email}`;
    case "already":
      return `[Admin] ${result.email} already has isAdmin`;
    case "granted":
      return `[Admin] Granted isAdmin to ${result.email}`;
  }
}

/** Logs and swallows errors so a grant failure does not stop the worker. */
export async function grantConfiguredAdmin(
  db: PrismaClient,
  log: (message: string) => void = console.log
): Promise<void> {
  try {
    const result = await grantAdminFromEnv(prismaAdminGrantStore(db));
    log(adminGrantLogLine(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`[Admin] Bootstrap grant failed: ${message}`);
  }
}
