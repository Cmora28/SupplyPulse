import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations";
import { canAddSupplier } from "@/lib/tier-limits";

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

    // Check tier limits
    const currentCount = await prisma.supplier.count({
      where: { userId: session.user.id },
    });

    if (!canAddSupplier(session.user.subscriptionTier, currentCount)) {
      return NextResponse.json(
        {
          error: `You've reached the supplier limit for your ${session.user.subscriptionTier} plan. Please upgrade to add more suppliers.`,
        },
        { status: 403 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...validated.data,
        shippingRoute: validated.data.shippingRoute || null,
        dependencies: validated.data.dependencies || null,
        userId: session.user.id,
      },
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
