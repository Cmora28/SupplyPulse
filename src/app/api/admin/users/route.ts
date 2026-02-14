import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@example.com";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
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
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
