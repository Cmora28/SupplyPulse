import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema, cuidSchema } from "@/lib/validations";
import { rateLimitAsync } from "@/lib/security";
import { AuditAction } from "@prisma/client";
import { diffSupplierFields, logAudit } from "@/lib/audit";
import { runSupplierConsistencyCheck } from "@/lib/supplier-validation-api";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!cuidSchema.safeParse(params.id).success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitAsync(`supplier-update:${session.user.id}`, 30, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = supplierSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const auditCtx = {
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? "",
      request,
      operation: "update" as const,
      supplierId: existing.id,
      supplierName: existing.name,
    };
    const consistencyError = await runSupplierConsistencyCheck(
      validated.data,
      auditCtx
    );
    if (consistencyError) return consistencyError;

    const before = { ...existing } as Record<string, unknown>;
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...validated.data,
        shippingRoute: validated.data.shippingRoute || null,
        dependencies: validated.data.dependencies || null,
      },
    });

    const after = { ...supplier } as Record<string, unknown>;
    const changes = diffSupplierFields(before, after);
    void logAudit({
      action: AuditAction.SUPPLIER_UPDATE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      targetType: "Supplier",
      targetId: supplier.id,
      metadata: {
        supplierName: supplier.name,
        changes,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!cuidSchema.safeParse(params.id).success) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitAsync(`supplier-delete:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) } }
      );
    }

    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.supplier.delete({ where: { id: params.id } });

    void logAudit({
      action: AuditAction.SUPPLIER_DELETE,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      request,
      targetType: "Supplier",
      targetId: existing.id,
      metadata: { supplierName: existing.name },
    });

    return NextResponse.json({ message: "Supplier deleted" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
