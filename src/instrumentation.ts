/**
 * Grants isAdmin to the account in ADMIN_EMAIL once the column exists.
 * Authorization still reads User.isAdmin. A missing column is logged and
 * does not crash the server; deploy the worker (or apply the SQL) first.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.ADMIN_EMAIL?.trim()) return;

  const { grantConfiguredAdmin } = await import("@/lib/admin-bootstrap");
  const { prisma } = await import("@/lib/prisma");
  await grantConfiguredAdmin(prisma);
}
