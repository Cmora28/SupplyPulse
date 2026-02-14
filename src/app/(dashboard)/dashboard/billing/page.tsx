"use client";

import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, Crown } from "lucide-react";
import { TIER_FEATURES, TIER_PRICES, TIER_LIMITS } from "@/lib/tier-limits";
import type { SubscriptionTier } from "@prisma/client";

export default function BillingPage() {
  const { data: session } = useSession();

  const tier = (session?.user?.subscriptionTier || "FREE") as SubscriptionTier;
  const features = TIER_FEATURES[tier];
  const price = TIER_PRICES[tier];
  const limit = TIER_LIMITS[tier];

  const handleUpgrade = async (targetTier: string) => {
    if (targetTier === "ENTERPRISE") {
      window.location.href =
        "mailto:sales@supplypulse.com?subject=Enterprise%20Inquiry";
      return;
    }

    try {
      const res = await fetch("/api/polar/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  const tierOrder: SubscriptionTier[] = [
    "FREE",
    "STANDARD",
    "PREMIUM",
    "ENTERPRISE",
  ];
  const currentIndex = tierOrder.indexOf(tier);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-base px-3 py-1 font-semibold"
            >
              {tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-3xl font-bold">
                {price}
                <span className="text-base font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Up to {limit === Infinity ? "unlimited" : limit} suppliers
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Included features:</p>
              <ul className="space-y-1.5">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {tier !== "ENTERPRISE" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get more suppliers and features with a higher tier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {tierOrder
                .filter((_, i) => i > currentIndex)
                .map((t) => (
                  <Card key={t} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t}</CardTitle>
                      <p className="text-2xl font-bold">
                        {TIER_PRICES[t]}
                        {t !== "ENTERPRISE" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /mo
                          </span>
                        )}
                      </p>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">
                        Up to{" "}
                        {TIER_LIMITS[t] === Infinity
                          ? "unlimited"
                          : TIER_LIMITS[t]}{" "}
                        suppliers
                      </p>
                    </CardContent>
                    <div className="px-6 pb-4">
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(t)}
                      >
                        {t === "ENTERPRISE" ? "Contact Sales" : `Upgrade to ${t}`}
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manage Subscription */}
      {tier !== "FREE" && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Update payment methods, view invoices, or cancel your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a
                href="https://polar.sh/settings/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Customer Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
