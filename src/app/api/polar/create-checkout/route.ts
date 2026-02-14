import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Polar } from "@polar-sh/sdk";

export const dynamic = "force-dynamic";

const polar = new Polar({
  accessToken: process.env.POLAR_API_KEY!,
});

const PRODUCT_IDS: Record<string, string | undefined> = {
  STANDARD: process.env.POLAR_STANDARD_PRICE_ID,
  PREMIUM: process.env.POLAR_PREMIUM_PRICE_ID,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tier } = body;

    if (!tier || !PRODUCT_IDS[tier]) {
      return NextResponse.json(
        { error: "Invalid tier selected" },
        { status: 400 }
      );
    }

    const productId = PRODUCT_IDS[tier];
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID not configured for this tier" },
        { status: 500 }
      );
    }

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${APP_URL}/dashboard?upgraded=true`,
      customerEmail: session.user.email,
      metadata: {
        userId: session.user.id,
        tier,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
