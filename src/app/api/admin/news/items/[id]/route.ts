import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL, rateLimitAsync } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await rateLimitAsync(`admin:news:${session.user.id}`, 60, 60 * 1000);
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
