import { NextRequest, NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  actionsForFeature,
  encodeAuditCursor,
  parseAuditCursor,
} from "@/lib/audit";
import { rateLimitAsync } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  feature: z
    .enum(["auth", "suppliers", "reports", "settings", "billing", "admin", "support"])
    .optional(),
  action: z.nativeEnum(AuditAction).optional(),
  actorEmail: z.string().trim().optional(),
  actorUserId: z.string().optional(),
  success: z.enum(["true", "false"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    const admin = access.user;

    const rl = await rateLimitAsync(`admin:audit:${admin.id}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid query" },
        { status: 400 }
      );
    }

    const {
      feature,
      action,
      actorEmail,
      actorUserId,
      success,
      from,
      to,
      cursor,
      limit = 25,
    } = parsed.data;

    const where: Prisma.AuditEventWhereInput = {};

    if (action) {
      where.action = action;
    } else if (feature) {
      const actions = actionsForFeature(feature);
      if (actions?.length) {
        where.action = { in: actions };
      }
    }

    if (actorUserId) {
      where.actorUserId = actorUserId;
    } else if (actorEmail) {
      const normalized = actorEmail.toLowerCase();
      where.actorEmail = normalized.includes("@")
        ? normalized
        : { startsWith: normalized, mode: "insensitive" };
    }

    if (success === "true") where.success = true;
    if (success === "false") where.success = false;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lt = new Date(to);
    }

    const cursorParsed = parseAuditCursor(cursor ?? null);
    if (cursorParsed) {
      where.OR = [
        { createdAt: { lt: cursorParsed.createdAt } },
        {
          createdAt: cursorParsed.createdAt,
          id: { lt: cursorParsed.id },
        },
      ];
    }

    const items = await prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && page.length > 0
        ? encodeAuditCursor(page[page.length - 1].createdAt, page[page.length - 1].id)
        : null;

    return NextResponse.json({ items: page, nextCursor });
  } catch (error) {
    console.error("Admin audit fetch error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
