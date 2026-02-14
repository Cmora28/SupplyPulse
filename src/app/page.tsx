import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Zap,
  FileText,
  Mail,
  Globe,
  BarChart3,
  Check,
  ArrowRight,
  Factory,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold">Supply Pulse</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-3 py-1">
              AI-Powered Supply Chain Intelligence
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Know your supply chain risks{" "}
              <span className="text-primary">before they hit</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Automatically generated weekly risk reports powered by advanced
              AI research. Monitor suppliers, identify disruptions, and
              receive actionable intelligence every Monday morning.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base px-8"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required. Free plan includes 1 supplier.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to proactive supply chain risk management.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Add your suppliers",
                description:
                  "Enter your supplier details: name, country, product category, lead time, and COGS percentage. That's all we need.",
                icon: Factory,
              },
              {
                step: "2",
                title: "AI analyzes risks",
                description:
                  "Every Monday, our AI researches current disruptions, assesses risks, and identifies upcoming threats for each supplier.",
                icon: Zap,
              },
              {
                step: "3",
                title: "Get your report",
                description:
                  "Receive a comprehensive PDF report via email with actionable intelligence, cited sources, and specific recommendations.",
                icon: Mail,
              },
            ].map((item) => (
              <Card key={item.step} className="text-center border-0 shadow-none bg-transparent">
                <CardContent className="pt-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">
                    STEP {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything you need for supply chain visibility
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive risk intelligence delivered automatically, so you
              can focus on running your business.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Risk Assessment",
                description:
                  "AI-powered analysis of financial health, capacity constraints, and market volatility for each supplier.",
              },
              {
                icon: Globe,
                title: "Global Monitoring",
                description:
                  "Track disruptions across countries and regions: natural disasters, political instability, tariff changes.",
              },
              {
                icon: FileText,
                title: "PDF Reports",
                description:
                  "Professional, consolidated PDF reports with markdown formatting, supplier profiles, and cited sources.",
              },
              {
                icon: Mail,
                title: "Email Delivery",
                description:
                  "Reports delivered to your inbox every Monday morning at 8 AM UTC. No manual effort needed.",
              },
              {
                icon: BarChart3,
                title: "Actionable Insights",
                description:
                  "Specific recommendations: buffer adjustments, alternative suppliers, and immediate action items.",
              },
              {
                icon: Zap,
                title: "Deep Research AI",
                description:
                  "Premium plans unlock Deep Research — 10x more detailed analysis with in-depth financial and geopolitical intelligence.",
              },
            ].map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <feature.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Simple pricing, powerful results
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "1 supplier",
                badge: null,
                highlight: null,
                features: [
                  "Weekly AI risk report",
                  "Email delivery",
                  "PDF download",
                ],
              },
              {
                name: "Standard",
                price: "$29",
                description: "Up to 5 suppliers",
                badge: null,
                highlight: null,
                features: [
                  "Everything in Free",
                  "Full citations",
                  "Consolidated PDF",
                  "Priority support",
                ],
                popular: true,
              },
              {
                name: "Premium",
                price: "$199",
                description: "Up to 15 suppliers",
                badge: "Deep Research",
                highlight: "10x more detailed AI analysis per supplier",
                features: [
                  "Everything in Standard",
                  "Deep Research AI reports",
                  "Financial & geopolitical intelligence",
                  "12-week archive",
                  "Excel/CSV export",
                ],
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.popular
                    ? "border-primary shadow-md"
                    : plan.badge
                    ? "border-amber-400 shadow-md shadow-amber-50"
                    : ""
                }
              >
                <CardContent className="pt-6">
                  {plan.popular && (
                    <Badge className="mb-3 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {plan.badge && !plan.popular && (
                    <Badge className="mb-3 bg-amber-500 text-white">
                      {plan.badge}
                    </Badge>
                  )}
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {plan.description}
                  </p>
                  {plan.highlight && (
                    <p className="text-xs font-medium text-amber-700 mb-3">
                      {plan.highlight}
                    </p>
                  )}
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${
                          f.includes("Deep Research") || f.includes("intelligence")
                            ? "text-amber-500"
                            : "text-primary"
                        }`} />
                        <span className={
                          f.includes("Deep Research") ? "font-medium" : ""
                        }>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View all plans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Start monitoring your supply chain today
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join manufacturing companies using AI-powered intelligence to stay
            ahead of supply chain disruptions.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-8">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">S</span>
              </div>
              <span className="text-sm font-medium">Supply Pulse</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Supply Pulse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
