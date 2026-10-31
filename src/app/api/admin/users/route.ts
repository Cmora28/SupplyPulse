import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    const admin = access.user;

    const rl = await rateLimitAsync(`admin:users:${admin.id}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10)));

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Run count + paginated query + aggregate stats in parallel
    const [totalUsers, users, stats] = await Promise.all([
      // Total matching users (for pagination)
      prisma.user.count({ where }),

      // Paginated users with their report runs
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionTier: true,
          emailNotifications: true,
          createdAt: true,
          _count: { select: { suppliers: true } },
          reportRuns: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              weekOf: true,
              status: true,
              createdAt: true,
              _count: { select: { items: true } },
              items: {
                select: {
                  id: true,
                  status: true,
                  supplier: { select: { name: true } },
                },
              },
            },
          },
        },
      }),

      // Global stats (independent of search filter)
      Promise.all([
        prisma.user.count(),
        prisma.supplier.count(),
        prisma.reportRun.count(),
      ]),
    ]);

    const [globalUserCount, globalSupplierCount, globalReportRunCount] = stats;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
      stats: {
        totalUsers: globalUserCount,
        totalSuppliers: globalSupplierCount,
        totalReportRuns: globalReportRunCount,
      },
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
