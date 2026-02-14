import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Polar } from "@polar-sh/sdk";

export const dynamic = "force-dynamic";

const polar = new Polar({
  accessToken: process.env.POLAR_API_KEY!,
});

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's Polar customer ID from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { polarCustomerId: true, email: true },
    });

    let customerId = user?.polarCustomerId;

    // If we don't have a customer ID, try to find them by email in Polar
    if (!customerId && user?.email) {
      try {
        const customers = await polar.customers.list({});
        const match = customers.result?.items?.find(
          (c: { email: string }) => c.email === user.email
        );
        if (match) {
          customerId = match.id;
          // Save for future use
          await prisma.user.update({
            where: { id: session.user.id },
            data: { polarCustomerId: customerId },
          });
        }
      } catch (lookupError) {
        console.error("[Polar] Customer lookup error:", lookupError);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No Polar customer found. Please contact support." },
        { status: 404 }
      );
    }

    // Create a customer portal session
    const customerSession = await polar.customerSessions.create({
      customerId,
    });

    return NextResponse.json({
      url: customerSession.customerPortalUrl,
    });
  } catch (error) {
    console.error("Customer portal error:", error);
    return NextResponse.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    );
  }
}
