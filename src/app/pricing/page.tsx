"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/client";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";
import { Logo } from "@/components/logo";

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const plans = [
    {
      name: t("common.free"),
      tier: "FREE",
      price: "$0",
      period: t("common.perMonth"),
      description: t("pricing.freeDesc"),
      badge: null,
      highlight: null,
      features: [
        t("pricing.freeFeature1"),
        t("pricing.freeFeature2"),
        t("pricing.freeFeature3"),
        t("pricing.freeFeature4"),
        t("pricing.freeFeature5"),
      ],
      cta: t("common.getStarted"),
      popular: false,
    },
    {
      name: t("common.standard"),
      tier: "STANDARD",
      price: "$29.99",
      period: t("common.perMonth"),
      description: t("pricing.standardDesc"),
      badge: null,
      highlight: null,
      features: [
        t("pricing.standardFeature1"),
        t("pricing.standardFeature2"),
        t("pricing.standardFeature3"),
        t("pricing.standardFeature4"),
        t("pricing.standardFeature5"),
        t("pricing.standardFeature6"),
      ],
      cta: t("pricing.upgradeTo", { tier: t("common.standard") }),
      popular: true,
    },
    {
      name: t("common.plus"),
      tier: "PLUS",
      price: "$79.99",
      period: t("common.perMonth"),
      description: t("pricing.plusDesc"),
      badge: t("common.deepResearch"),
      highlight: null,
      features: [
        t("pricing.plusFeature1"),
        t("pricing.plusFeature2"),
        t("pricing.plusFeature3"),
        t("pricing.plusFeature4"),
        t("pricing.plusFeature5"),
        t("pricing.plusFeature6"),
        t("pricing.plusFeature7"),
        t("pricing.plusFeature8"),
      ],
      cta: t("pricing.upgradeTo", { tier: t("common.plus") }),
      popular: false,
    },
    {
      name: t("common.premium"),
      tier: "PREMIUM",
      price: "$199.99",
      period: t("common.perMonth"),
      description: t("pricing.premiumDesc"),
      badge: t("common.deepResearch"),
      highlight: "10x more detailed AI analysis with deep web research, financial data, and geopolitical intelligence per supplier.",
      features: [
        t("pricing.premiumFeature1"),
        t("pricing.premiumFeature2"),
        t("pricing.premiumFeature3"),
        t("pricing.premiumFeature4"),
        t("pricing.premiumFeature5"),
        t("pricing.premiumFeature6"),
        t("pricing.premiumFeature7"),
        t("pricing.premiumFeature8"),
      ],
      cta: t("pricing.upgradeTo", { tier: t("common.premium") }),
      popular: false,
    },
    {
      name: t("common.enterprise"),
      tier: "ENTERPRISE",
      price: "Custom",
      period: "",
      description: t("pricing.enterpriseDesc"),
      badge: t("common.deepResearch"),
      highlight: null,
      features: [
        t("pricing.enterpriseFeature1"),
        t("pricing.enterpriseFeature2"),
        t("pricing.enterpriseFeature3"),
        t("pricing.enterpriseFeature4"),
        t("pricing.enterpriseFeature5"),
        t("pricing.enterpriseFeature6"),
        t("pricing.enterpriseFeature7"),
        t("pricing.enterpriseFeature8"),
      ],
      cta: t("common.contactSales"),
      popular: false,
    },
  ];

  const handleUpgrade = async (tier: string) => {
    if (!session) {
      router.push("/register");
      return;
    }

    if (tier === "FREE") {
      router.push("/dashboard");
      return;
    }

    if (tier === "ENTERPRISE") {
      window.location.href = "mailto:sales@supplypulse.net?subject=Enterprise%20Inquiry";
      return;
    }

    try {
      const res = await fetch("/api/polar/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  const currentTier = session?.user?.subscriptionTier || null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-bold">{t("common.appName")}</span>
          </Link>
          <div className="flex items-center gap-2">
            {session ? (
              <>
                <PublicLanguageSwitcher />
                <Link href="/dashboard">
                  <Button variant="outline">{t("common.dashboard")}</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">{t("common.signIn")}</Button>
                </Link>
                <PublicLanguageSwitcher />
                <Link href="/register">
                  <Button>{t("common.getStarted")}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            {t("pricing.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-lg"
                    : plan.tier === "PREMIUM" || plan.tier === "PLUS"
                    ? "border-amber-500 shadow-lg shadow-amber-100"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {t("common.mostPopular")}
                    </Badge>
                  </div>
                )}
                {plan.badge && !plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                    {plan.price !== "$0" && plan.price !== "Custom" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("common.applicableTaxes")}
                      </p>
                    )}
                  </div>
                  {plan.highlight && (
                    <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs font-medium text-amber-800">
                        {plan.highlight}
                      </p>
                    </div>
                  )}
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          feature.includes("Deep Research")
                            ? "text-amber-500"
                            : "text-primary"
                        }`} />
                        <span className={
                          feature.includes("Deep Research") || feature.includes("In-depth")
                            ? "font-medium"
                            : ""
                        }>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full ${
                      plan.tier === "PREMIUM" || plan.tier === "PLUS"
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : (plan.tier === "PREMIUM" || plan.tier === "PLUS") ? "default" : "outline"}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.tier)}
                  >
                    {isCurrent ? t("common.currentPlan") : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          {t("pricing.taxNote")}
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t("legal.privacyTitle")}
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t("legal.termsTitle")}
          </Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-foreground transition-colors">
            {t("legal.cookiesTitle")}
          </Link>
        </div>
      </div>
    </div>
  );
}
