import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
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
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

export const metadata: Metadata = {
  title: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring & Disruption Detection",
  description:
    "Supply Pulse monitors your supply chain for disruptions using AI-powered research. Get weekly risk reports with cited sources, actionable recommendations, and supplier risk scores. Free plan available.",
  alternates: {
    canonical: "/",
  },
};

// FAQ data for JSON-LD (English only for structured data, UI uses i18n)
const FAQ_ITEMS = [
  {
    question: "What is supply chain risk monitoring?",
    answer:
      "Supply chain risk monitoring is the continuous process of identifying, assessing, and tracking potential threats to your supply chain. This includes monitoring suppliers for financial instability, geopolitical risks, natural disasters, regulatory changes, and operational disruptions. Supply Pulse automates this process using AI to research and analyze risks across your entire supplier network every week.",
  },
  {
    question: "How does AI detect supply chain disruptions?",
    answer:
      "Supply Pulse uses advanced AI research models to scan thousands of sources including news outlets, government databases, trade publications, financial reports, and geopolitical intelligence feeds. The AI identifies current disruptions affecting your specific suppliers and predicts emerging risks for the next 30 days. Every finding is backed by cited sources so you can verify the intelligence.",
  },
  {
    question: "What types of supply chain risks does Supply Pulse monitor?",
    answer:
      "Supply Pulse monitors a comprehensive range of supply chain risks: geopolitical instability and trade wars, natural disasters and climate events, supplier financial health and bankruptcy risk, port congestion and shipping delays, tariff and regulatory changes, raw material shortages, labor disputes and strikes, cybersecurity threats to suppliers, and capacity constraints.",
  },
  {
    question: "How often are supply chain reports generated?",
    answer:
      "Reports are generated on a weekly schedule that you choose during registration. You select the day of the week and time (UTC) that works best for your team. Each report covers disruptions from the past 7 days and predicted risks for the next 30 days, delivered as a professional PDF via email.",
  },
  {
    question: "What is included in a supply chain risk report?",
    answer:
      "Each weekly report includes: a risk assessment for every monitored supplier, current disruptions identified in the past 7 days, predicted risks for the next 30 days, actionable recommendations including buffer stock adjustments and alternative supplier suggestions, cited sources for every finding, and a consolidated PDF with supplier profiles, country risk analysis, and shipping route assessments.",
  },
  {
    question: "How can supply chain disruptions impact my business?",
    answer:
      "Supply chain disruptions can lead to production stoppages, delayed deliveries, increased costs, lost revenue, and damaged customer relationships. The average disruption costs enterprises $43-47 million annually. Industries with complex global supply chains — manufacturing, automotive, electronics, pharmaceuticals — are particularly vulnerable. Early warning through AI-powered monitoring helps reduce response time from days to hours.",
  },
  {
    question: "What is Deep Research AI and how is it different?",
    answer:
      "Deep Research AI is available on Premium and Enterprise plans. While standard AI analysis provides comprehensive weekly reports, Deep Research performs 10x more detailed investigation per supplier — including in-depth financial analysis, extended geopolitical intelligence, sub-tier supplier risk mapping, and cross-referencing across specialized industry databases.",
  },
  {
    question: "Can I try Supply Pulse for free?",
    answer:
      "Yes. The Free plan lets you monitor 1 supplier with full weekly AI risk reports, email delivery, and PDF downloads — no credit card required. You can upgrade to Standard ($29/month for up to 5 suppliers) or Premium ($199/month for up to 15 suppliers with Deep Research AI) at any time.",
  },
];

// JSON-LD structured data
const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Supply Pulse",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: APP_URL,
  description:
    "AI-powered supply chain risk monitoring platform that generates weekly risk reports with cited sources and actionable intelligence for every supplier in your network.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "Monitor 1 supplier with weekly AI risk reports",
    },
    {
      "@type": "Offer",
      name: "Standard",
      price: "29",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "29",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      description: "Monitor up to 5 suppliers with full citations",
    },
    {
      "@type": "Offer",
      name: "Premium",
      price: "199",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "199",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      description: "Monitor up to 15 suppliers with Deep Research AI analysis",
    },
  ],
  featureList: [
    "AI-powered supply chain risk assessment",
    "Weekly PDF risk reports with cited sources",
    "Automated email delivery",
    "Geopolitical and financial risk analysis",
    "Global disruption monitoring",
    "Actionable recommendations",
    "Multi-language support",
    "Deep Research AI for premium plans",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

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
      ],
      popular: false,
    },
  ];

  const stats = [
    { valueKey: "landing.stat1Value", labelKey: "landing.stat1Label" },
    { valueKey: "landing.stat2Value", labelKey: "landing.stat2Label" },
    { valueKey: "landing.stat3Value", labelKey: "landing.stat3Label" },
    { valueKey: "landing.stat4Value", labelKey: "landing.stat4Label" },
  ];

  const faqs = [
    { qKey: "landing.faq1Q", aKey: "landing.faq1A" },
    { qKey: "landing.faq2Q", aKey: "landing.faq2A" },
    { qKey: "landing.faq3Q", aKey: "landing.faq3A" },
    { qKey: "landing.faq4Q", aKey: "landing.faq4A" },
    { qKey: "landing.faq5Q", aKey: "landing.faq5A" },
    { qKey: "landing.faq6Q", aKey: "landing.faq6A" },
    { qKey: "landing.faq7Q", aKey: "landing.faq7A" },
    { qKey: "landing.faq8Q", aKey: "landing.faq8A" },
  ];

  return (
    <div className="min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Navigation */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-lg font-bold">{t("common.appName")}</span>
            </div>
            <div className="flex items-center gap-2">
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
              <PublicLanguageSwitcher />
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
              {t("landing.heroSubtitle")}
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
            <div className="mt-6 flex flex-col items-center gap-2">
              <a
                href="/supply-chain-report-example.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/40 hover:shadow-md"
              >
                <FileText className="h-4 w-4" />
                {t("landing.viewSampleReport")}
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0 leading-4 uppercase tracking-wider font-semibold">
                  Deep Research
                </Badge>
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
              </a>
              <p className="text-xs text-muted-foreground">
                {t("landing.sampleReportDesc")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {t("landing.noCreditCard")}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section - Supply Chain Disruption Impact */}
      <section className="py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight">
                {t("landing.statsTitle")}
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.statsSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-4">
                <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                  {t(stat.valueKey)}
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  {t(stat.labelKey)}
                </p>
              </div>
            ))}
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

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight">
                {t("landing.faqTitle")}
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.faqSubtitle")}
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border rounded-lg bg-card"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-left font-medium hover:bg-muted/50 rounded-lg transition-colors">
                  <span className="pr-4">{t(faq.qKey)}</span>
                  <span className="text-muted-foreground text-xl flex-shrink-0 group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 text-muted-foreground leading-relaxed text-sm">
                  {t(faq.aKey)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Logo size={24} />
                <span className="text-sm font-medium">{t("common.appName")}</span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="mailto:support@supplypulse.net"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {t("landing.footerSupport")}
                </a>
                <p className="text-sm text-muted-foreground">
                  {t("landing.footerCopyright", { year: new Date().getFullYear() })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
      </footer>
    </div>
  );
}
