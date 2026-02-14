import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...validated.data,
        shippingRoute: validated.data.shippingRoute || null,
        dependencies: validated.data.dependencies || null,
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
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.supplier.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Supplier deleted" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
