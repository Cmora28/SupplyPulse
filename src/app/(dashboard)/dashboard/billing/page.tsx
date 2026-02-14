"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, Crown, Loader2 } from "lucide-react";
import { TIER_FEATURES, TIER_PRICES, TIER_LIMITS } from "@/lib/tier-limits";
import type { SubscriptionTier } from "@prisma/client";
import { useTranslation } from "@/i18n/client";

export default function BillingPage() {
  const { data: session, update } = useSession();
  const { t } = useTranslation();
  const [dbTier, setDbTier] = useState<SubscriptionTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Fetch fresh tier from database on mount
  useEffect(() => {
    update(); // Force session refresh
    fetch("/api/user")
      .then((r) => r.json())
      .then((u) => {
        if (u?.subscriptionTier) {
          setDbTier(u.subscriptionTier);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = (dbTier || session?.user?.subscriptionTier || "FREE") as SubscriptionTier;
  const features = TIER_FEATURES[tier];
  const price = TIER_PRICES[tier];
  const limit = TIER_LIMITS[tier];

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/polar/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        console.error("No portal URL returned:", data.error);
      }
    } catch (error) {
      console.error("Customer portal error:", error);
    } finally {
      setPortalLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight">{t("billing.title")}</h1>
        <p className="text-muted-foreground">
          {t("billing.subtitle")}
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                {t("billing.currentPlan")}
              </CardTitle>
              <CardDescription>{t("billing.currentPlanDesc")}</CardDescription>
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
                  {t("common.perMonth")}
                </span>
              </p>
              {price !== "$0" && price !== "Custom" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("common.applicableTaxes")}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {limit === Infinity
                  ? t("billing.unlimitedSuppliers")
                  : t("billing.upToSuppliers", { limit: String(limit) })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t("billing.includedFeatures")}</p>
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

      {/* Manage Subscription */}
      {tier !== "FREE" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billing.manageSubscription")}</CardTitle>
            <CardDescription>
              {t("billing.manageSubscriptionDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              {t("billing.openCustomerPortal")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Options */}
      {tier !== "ENTERPRISE" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billing.upgradeTitle")}</CardTitle>
            <CardDescription>
              {t("billing.upgradeDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {tierOrder
                .filter((_, i) => i > currentIndex)
                .map((upgradeTier) => {
                  const isDeepResearch = upgradeTier === "PREMIUM" || upgradeTier === "ENTERPRISE";
                  return (
                    <Card key={upgradeTier} className={`border ${isDeepResearch ? "border-amber-300" : ""}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{upgradeTier}</CardTitle>
                          {isDeepResearch && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                              {t("common.deepResearch")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold">
                          {TIER_PRICES[upgradeTier]}
                          {upgradeTier !== "ENTERPRISE" && (
                            <span className="text-sm font-normal text-muted-foreground">
                              {t("common.perMo")}
                            </span>
                          )}
                        </p>
                        {TIER_PRICES[upgradeTier] !== "$0" && upgradeTier !== "ENTERPRISE" && (
                          <p className="text-xs text-muted-foreground">
                            {t("common.applicableTaxes")}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {TIER_LIMITS[upgradeTier] === Infinity
                            ? t("billing.unlimitedSuppliers")
                            : t("billing.upToSuppliers", { limit: String(TIER_LIMITS[upgradeTier]) })}
                        </p>
                        {isDeepResearch && (
                          <p className="text-xs text-amber-700 font-medium">
                            {t("billing.deepResearchBadge")}
                          </p>
                        )}
                      </CardContent>
                      <div className="px-6 pb-4">
                        <Button
                          className={`w-full ${isDeepResearch ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                          onClick={() => handleUpgrade(upgradeTier)}
                        >
                          {upgradeTier === "ENTERPRISE" ? t("common.contactSales") : t("billing.upgradeTo", { tier: upgradeTier })}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
