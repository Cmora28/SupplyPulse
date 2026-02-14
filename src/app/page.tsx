import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
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
  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  const steps = [
    { step: "1", titleKey: "landing.step1Title", descKey: "landing.step1Desc", icon: Factory },
    { step: "2", titleKey: "landing.step2Title", descKey: "landing.step2Desc", icon: Zap },
    { step: "3", titleKey: "landing.step3Title", descKey: "landing.step3Desc", icon: Mail },
  ];

  const features = [
    { icon: Shield, titleKey: "landing.featureRiskTitle", descKey: "landing.featureRiskDesc" },
    { icon: Globe, titleKey: "landing.featureGlobalTitle", descKey: "landing.featureGlobalDesc" },
    { icon: FileText, titleKey: "landing.featurePdfTitle", descKey: "landing.featurePdfDesc" },
    { icon: Mail, titleKey: "landing.featureEmailTitle", descKey: "landing.featureEmailDesc" },
    { icon: BarChart3, titleKey: "landing.featureInsightsTitle", descKey: "landing.featureInsightsDesc" },
    { icon: Zap, titleKey: "landing.featureDeepTitle", descKey: "landing.featureDeepDesc" },
  ];

  const plans = [
    {
      name: t("common.free"),
      price: "$0",
      description: t("landing.supplier1"),
      badge: null,
      highlight: null,
      features: [
        t("landing.weeklyReport"),
        t("landing.emailDelivery"),
        t("landing.pdfDownload"),
      ],
      popular: false,
    },
    {
      name: t("common.standard"),
      price: "$29",
      description: t("landing.upTo5"),
      badge: null,
      highlight: null,
      features: [
        t("landing.everythingInFree"),
        t("landing.fullCitations"),
        t("landing.consolidatedPdf"),
        t("landing.prioritySupport"),
      ],
      popular: true,
    },
    {
      name: t("common.premium"),
      price: "$199",
      description: t("landing.upTo15"),
      badge: t("common.deepResearch"),
      highlight: t("landing.deepResearchDetail"),
      features: [
        t("landing.everythingInStandard"),
        t("landing.deepResearchReports"),
        t("landing.geoFinancialRisk"),
        t("landing.weekArchive"),
        t("landing.excelExport"),
      ],
      popular: false,
    },
  ];

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
              <span className="text-lg font-bold">{t("common.appName")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  {t("common.pricing")}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  {t("common.getStartedFree")}
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
              {t("landing.heroTitle")}
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              {t("landing.heroSubtitle").split("{highlight}")[0]}
              <span className="text-primary">{t("landing.heroSubtitle").includes("{highlight}") ? "" : ""}</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t("landing.heroDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-base px-8">
                  {t("landing.startFree")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base px-8"
                >
                  {t("landing.viewPricing")}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {t("landing.noCreditCard")}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {t("landing.howItWorks")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.howItWorksSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <Card key={item.step} className="text-center border-0 shadow-none bg-transparent">
                <CardContent className="pt-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">
                    {t(`landing.step${item.step}` as `landing.step1` | `landing.step2` | `landing.step3`)}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t(item.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(item.descKey)}
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
              {t("landing.featuresTitle")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.featuresSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.titleKey}>
                <CardContent className="pt-6">
                  <feature.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(feature.descKey)}
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
              {t("landing.pricingTitle")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("landing.pricingSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
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
                      {t("common.mostPopular")}
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
                    <span className="text-muted-foreground">{t("common.perMo")}</span>
                  </div>
                  {plan.price !== "$0" && (
                    <p className="text-xs text-muted-foreground">
                      {t("common.applicableTaxes")}
                    </p>
                  )}
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
                        <Check className="h-4 w-4 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("common.taxDisclaimer")}
          </p>
          <div className="text-center mt-4">
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                {t("landing.viewAllPlans")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            {t("landing.ctaSubtitle")}
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-8">
              {t("common.getStartedFree")} <ArrowRight className="ml-2 h-4 w-4" />
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
              <span className="text-sm font-medium">{t("common.appName")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("landing.footerCopyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
