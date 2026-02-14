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

const plans = [
  {
    name: "Free",
    tier: "FREE",
    price: "$0",
    period: "/month",
    description: "Get started with basic supply chain monitoring.",
    features: [
      "Monitor 1 supplier",
      "Weekly AI-generated risk report",
      "Email delivery every Monday",
      "PDF download",
      "Basic email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Standard",
    tier: "STANDARD",
    price: "$49",
    period: "/month",
    description: "For teams monitoring multiple critical suppliers.",
    features: [
      "Monitor up to 5 suppliers",
      "Weekly AI-generated risk reports",
      "Email delivery every Monday",
      "PDF downloads with full citations",
      "Priority email support",
      "Consolidated multi-supplier PDF",
    ],
    cta: "Upgrade to Standard",
    popular: true,
  },
  {
    name: "Premium",
    tier: "PREMIUM",
    price: "$99",
    period: "/month",
    description: "Advanced monitoring with full history and exports.",
    features: [
      "Monitor up to 20 suppliers",
      "Weekly AI-generated risk reports",
      "Email delivery every Monday",
      "PDF downloads with full citations",
      "Priority email support",
      "Consolidated multi-supplier PDF",
      "Report history archive (last 12 weeks)",
      "Export to Excel/CSV",
    ],
    cta: "Upgrade to Premium",
    popular: false,
  },
  {
    name: "Enterprise",
    tier: "ENTERPRISE",
    price: "Custom",
    period: "",
    description: "Tailored solutions for large organizations.",
    features: [
      "Unlimited suppliers",
      "Weekly AI-generated risk reports",
      "Custom report scheduling",
      "Dedicated account manager",
      "API access for integration",
      "Custom branding on reports",
      "SSO integration",
      "Slack/Teams notifications",
      "Custom data retention policies",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();

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
      window.location.href = "mailto:sales@supplypulse.com?subject=Enterprise%20Inquiry";
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
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold">Supply Pulse</span>
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
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
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your supply chain monitoring needs.
            No credit card required for the Free plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary shadow-lg" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.tier)}
                  >
                    {isCurrent ? "Current Plan" : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
