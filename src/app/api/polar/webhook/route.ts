import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("webhook-signature") || 
                      request.headers.get("x-polar-signature") || "";

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("POLAR_WEBHOOK_SECRET not configured");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Verify signature if provided
    if (signature) {
      try {
        const isValid = verifyWebhookSignature(body, signature, webhookSecret);
        if (!isValid) {
          console.error("Invalid webhook signature");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } catch {
        console.error("Signature verification failed");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);
    const eventType = event.type || event.event;

    console.log(`[Polar Webhook] Event: ${eventType}`);

    switch (eventType) {
      case "subscription.created":
      case "subscription.updated": {
        const subscription = event.data;
        const metadata = subscription.metadata || {};
        const userId = metadata.userId;
        const tier = metadata.tier;

        if (!userId || !tier) {
          console.error("Missing userId or tier in subscription metadata");
          break;
        }

        const validTiers = ["STANDARD", "PREMIUM", "ENTERPRISE"];
        if (!validTiers.includes(tier)) {
          console.error(`Invalid tier: ${tier}`);
          break;
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: tier as "STANDARD" | "PREMIUM" | "ENTERPRISE",
            polarCustomerId: subscription.customer_id || subscription.customerId || null,
            polarSubscriptionId: subscription.id || null,
          },
        });

        console.log(`[Polar Webhook] User ${userId} upgraded to ${tier}`);
        break;
      }

      case "subscription.canceled":
      case "subscription.expired": {
        const subscription = event.data;
        const subscriptionId = subscription.id;

        if (!subscriptionId) {
          console.error("Missing subscription ID in cancellation event");
          break;
        }

        const user = await prisma.user.findFirst({
          where: { polarSubscriptionId: subscriptionId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionTier: "FREE",
              polarSubscriptionId: null,
            },
          });
          console.log(`[Polar Webhook] User ${user.id} downgraded to FREE`);
        } else {
          console.log(
            `[Polar Webhook] No user found for subscription ${subscriptionId}`
          );
        }
        break;
      }

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
