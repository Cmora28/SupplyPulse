import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { rateLimitAsync, getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`webhook:${ip}`, 100, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.text();
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Polar Webhook] POLAR_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event: ReturnType<typeof validateEvent>;
    try {
      event = validateEvent(
        body,
        Object.fromEntries(request.headers.entries()),
        webhookSecret
      );
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error("[Polar Webhook] Signature verification failed:", error.message);
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 }
        );
      }
      throw error;
    }

    const eventType = event.type;
    const eventData = event.data as Record<string, unknown>;
    const eventId = (eventData.id as string) || "";
    console.log(`[Polar Webhook] Event: ${eventType}, id: ${eventId}`);

    // Idempotency: skip if we already processed this subscription state
    if (eventId) {
      const idempotencyKey = `webhook:idem:${eventType}:${eventId}`;
      const dup = await rateLimitAsync(idempotencyKey, 1, 5 * 60 * 1000);
      if (!dup.success) {
        console.log(`[Polar Webhook] Duplicate event skipped: ${eventType} ${eventId}`);
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
    }

    switch (eventType) {
      case "subscription.created":
      case "subscription.updated": {
        const subscription = event.data;
        const metadata = (subscription as Record<string, unknown>).metadata as
          | Record<string, string>
          | undefined;
        const userId = metadata?.userId;
        const tier = metadata?.tier;

        console.log(
          `[Polar Webhook] Subscription event - userId: ${userId}, tier: ${tier}, subId: ${(subscription as Record<string, unknown>).id}`
        );

        if (!userId || !tier) {
          console.error(
            "[Polar Webhook] Missing userId or tier in subscription metadata"
          );
          return NextResponse.json(
            { error: "Missing userId or tier in metadata" },
            { status: 400 }
          );
        }

        const validTiers = ["STANDARD", "PREMIUM", "ENTERPRISE"];
        if (!validTiers.includes(tier)) {
          console.error(`[Polar Webhook] Invalid tier: ${tier}`);
          return NextResponse.json(
            { error: `Invalid tier: ${tier}` },
            { status: 400 }
          );
        }

        const sub = subscription as Record<string, unknown>;
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: tier as "STANDARD" | "PREMIUM" | "ENTERPRISE",
            polarCustomerId:
              (sub.customer_id as string) ||
              (sub.customerId as string) ||
              null,
            polarSubscriptionId: (sub.id as string) || null,
          },
        });

        console.log(`[Polar Webhook] User ${userId} upgraded to ${tier}`);
        break;
      }

      case "subscription.canceled":
      case "subscription.revoked": {
        const subscription = event.data as Record<string, unknown>;
        const subscriptionId = subscription.id as string;

        if (!subscriptionId) {
          console.error(
            "[Polar Webhook] Missing subscription ID in cancellation event"
          );
          return NextResponse.json(
            { error: "Missing subscription ID" },
            { status: 400 }
          );
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
    console.error("[Polar Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
