import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STARTUP_SQL_FILES } from "./apply-sql";
import {
  adminGrantLogLine,
  grantAdminByEmail,
  normalizeAdminEmail,
  type AdminGrantStore,
} from "./admin-bootstrap";
import { decideAdminAccess, sessionIsAdmin } from "./admin-guard";

const adminUser = {
  id: "user_admin",
  email: "owner@example.com",
  name: "Owner",
  isAdmin: true,
};

describe("admin guard", () => {
  it("returns 403 when the signed-in user is not an admin", () => {
    const decision = decideAdminAccess({
      sessionUser: { id: "user_admin" },
      dbUser: { ...adminUser, isAdmin: false },
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.status, 403);
      assert.equal(decision.error, "Forbidden");
    }
  });

  it("returns 403 when the session user does not match the database row", () => {
    const decision = decideAdminAccess({
      sessionUser: { id: "someone_else" },
      dbUser: adminUser,
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });

  it("returns 403 when the database user is missing", () => {
    const decision = decideAdminAccess({
      sessionUser: { id: "user_admin" },
      dbUser: null,
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.status, 403);
  });

  it("returns 200 when the database user is an admin", () => {
    const decision = decideAdminAccess({
      sessionUser: { id: "user_admin" },
      dbUser: adminUser,
    });
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.equal(decision.status, 200);
      assert.deepEqual(decision.user, {
        id: "user_admin",
        email: "owner@example.com",
        name: "Owner",
      });
    }
  });

  it("ignores email when deciding admin access", () => {
    const denied = decideAdminAccess({
      sessionUser: { id: "user_admin" },
      dbUser: { ...adminUser, email: "owner@example.com", isAdmin: false },
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
  });

  it("treats only boolean true as the session admin flag", () => {
    assert.equal(sessionIsAdmin(true), true);
    assert.equal(sessionIsAdmin(false), false);
    assert.equal(sessionIsAdmin(undefined), false);
    assert.equal(sessionIsAdmin("true"), false);
    assert.equal(sessionIsAdmin(1), false);
  });
});

describe("admin bootstrap grant", () => {
  function memoryStore(seed?: { id: string; email: string; isAdmin: boolean }): AdminGrantStore & {
    granted: string[];
  } {
    const granted: string[] = [];
    let row = seed ? { ...seed } : null;
    return {
      granted,
      async findUserByEmail(email) {
        if (!row || row.email.toLowerCase() !== email.toLowerCase()) return null;
        return { ...row };
      },
      async grant(id) {
        granted.push(id);
        if (row && row.id === id) row = { ...row, isAdmin: true };
      },
    };
  }

  it("normalizes emails and rejects empty or invalid values", () => {
    assert.equal(normalizeAdminEmail("  Owner@Example.com "), "owner@example.com");
    assert.equal(normalizeAdminEmail(""), null);
    assert.equal(normalizeAdminEmail("not-an-email"), null);
    assert.equal(normalizeAdminEmail(undefined), null);
  });

  it("grants isAdmin once and does not create a missing user", async () => {
    const empty = memoryStore();
    const missing = await grantAdminByEmail(empty, "owner@example.com");
    assert.equal(missing.status, "missing");
    assert.deepEqual(empty.granted, []);

    const store = memoryStore({ id: "user_admin", email: "owner@example.com", isAdmin: false });
    const granted = await grantAdminByEmail(store, "Owner@Example.com");
    assert.equal(granted.status, "granted");
    assert.deepEqual(store.granted, ["user_admin"]);

    const again = await grantAdminByEmail(store, "owner@example.com");
    assert.equal(again.status, "already");
    assert.deepEqual(store.granted, ["user_admin"]);
  });

  it("describes a skipped grant without embedding an email address", () => {
    const line = adminGrantLogLine({ status: "skipped" });
    assert.match(line, /ADMIN_EMAIL is not set/);
    assert.equal(line.includes("@"), false);
  });
});

describe("admin column SQL", () => {
  it("registers an idempotent isAdmin column for the worker and Prisma migrate", () => {
    assert.equal(
      STARTUP_SQL_FILES.some((file) => file.includes("20261031_user_is_admin.sql")),
      true
    );
    const statement = 'ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false';
    const sql = readFileSync(
      new URL("../../prisma/sql/20261031_user_is_admin.sql", import.meta.url),
      "utf8"
    );
    const migration = readFileSync(
      new URL("../../prisma/migrations/20261031180000_user_is_admin/migration.sql", import.meta.url),
      "utf8"
    );
    assert.match(sql, new RegExp(statement));
    assert.match(migration, new RegExp(statement));
  });
});
