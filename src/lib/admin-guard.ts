/**
 * Pure admin decision shared by middleware and requireAdmin().
 * Email is not an input: access is User.isAdmin in the database.
 * Middleware can import this file; it has no server-only dependencies.
 */

export type AdminPrincipal = {
  id: string;
  email: string;
  name: string;
};

export type AdminDecision =
  | { ok: true; status: 200; user: AdminPrincipal }
  | { ok: false; status: 401; error: "Unauthorized" }
  | { ok: false; status: 403; error: "Forbidden" };

/** True only for a boolean true written into the JWT from the database. */
export function sessionIsAdmin(value: unknown): boolean {
  return value === true;
}

export function decideAdminAccess(input: {
  sessionUser: { id?: string | null } | null | undefined;
  dbUser: { id: string; email: string; name: string; isAdmin: boolean } | null;
}): AdminDecision {
  const sessionId = input.sessionUser?.id;
  if (!sessionId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!input.dbUser || input.dbUser.id !== sessionId || !input.dbUser.isAdmin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return {
    ok: true,
    status: 200,
    user: {
      id: input.dbUser.id,
      email: input.dbUser.email,
      name: input.dbUser.name,
    },
  };
}
