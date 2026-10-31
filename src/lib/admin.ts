import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decideAdminAccess, type AdminPrincipal } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

/**
 * Server-only admin gate. Authorization is User.isAdmin, loaded from the
 * database on each call. Do not compare emails or read NEXT_PUBLIC_ADMIN_EMAIL.
 *
 * API routes under /api/admin (and any other admin API):
 *
 *   const access = await requireAdmin();
 *   if (!access.ok) return access.response;
 *   const admin = access.user;
 *
 * Server components under /dashboard/admin:
 *
 *   const access = await requireAdmin();
 *   if (!access.ok) redirect("/dashboard");
 *
 * The JWT `isAdmin` flag is only for middleware and for showing links.
 * It is copied from this column in the NextAuth jwt callback.
 */
export type AdminAccess =
  | { ok: true; status: 200; user: AdminPrincipal }
  | { ok: false; status: 401 | 403; response: NextResponse };

export async function requireAdmin(): Promise<AdminAccess> {
  const session = await getServerSession(authOptions);
  const sessionId = session?.user?.id;
  const dbUser = sessionId
    ? await prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, email: true, name: true, isAdmin: true },
      })
    : null;

  const decision = decideAdminAccess({
    sessionUser: sessionId ? { id: sessionId } : null,
    dbUser,
  });

  if (decision.ok) {
    return { ok: true, status: 200, user: decision.user };
  }

  return {
    ok: false,
    status: decision.status,
    response: NextResponse.json({ error: decision.error }, { status: decision.status }),
  };
}
