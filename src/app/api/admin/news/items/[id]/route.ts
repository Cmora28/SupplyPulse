import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;
    const admin = access.user;

    const rl = await rateLimitAsync(`admin:news:${admin.id}`, 60, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    const id = params.id?.trim();
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const item = await prisma.newsItem.findUnique({
      where: { id },
      include: {
        run: true,
        jevCalls: { orderBy: { createdAt: "asc" } },
        alerts: {
          orderBy: { createdAt: "asc" },
          include: {
            supplier: { select: { id: true, name: true, country: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Admin news item fetch error:", error);
    return NextResponse.json({ error: "Failed to load news item" }, { status: 500 });
  }
}
