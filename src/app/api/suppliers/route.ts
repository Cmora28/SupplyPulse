import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";
import { canAddSupplier } from "@/lib/tier-limits";
import { rateLimit, getClientIp } from "@/lib/security";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { runSupplierConsistencyCheck } from "@/lib/supplier-validation-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // A04: Rate limit supplier creation — 20 per hour per user
    const ip = getClientIp(request);
    const rl = rateLimit(`supplier:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = supplierSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check tier limits — always read tier from DB for accuracy
    const [currentCount, dbUser] = await Promise.all([
      prisma.supplier.count({ where: { userId: session.user.id } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionTier: true },
      }),
    ]);
    const tier = dbUser?.subscriptionTier || session.user.subscriptionTier;

    if (!canAddSupplier(tier, currentCount)) {
      return NextResponse.json(
        {
          error: `You've reached the supplier limit for your ${tier} plan. Please upgrade to add more suppliers.`,
        },
        { status: 403 }
      );
    }

    const auditCtx = {
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? "",
      request,
      operation: "create" as const,
    };
    const consistencyError = await runSupplierConsistencyCheck(
      validated.data,
      auditCtx
    );
    if (consistencyError) return consistencyError;

    const supplier = await prisma.supplier.create({
      data: {
        ...validated.data,
        shippingRoute: validated.data.shippingRoute || null,
        dependencies: validated.data.dependencies || null,
        userId: session.user.id,
      },
    });

    void logAudit({
      action: AuditAction.SUPPLIER_CREATE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      targetType: "Supplier",
      targetId: supplier.id,
      metadata: { supplierName: supplier.name },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
