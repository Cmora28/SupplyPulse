import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const localeSchema = z.object({
  locale: z.enum(["en", "es", "pt", "fr", "de"]),
});

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = localeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale: parsed.data.locale },
    });

    return NextResponse.json({ message: "Locale updated" });
  } catch (error) {
    console.error("Locale update error:", error);
    return NextResponse.json(
      { error: "Failed to update locale" },
      { status: 500 }
    );
  }
}
