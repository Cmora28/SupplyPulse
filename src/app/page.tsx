import Link from "next/link";
import Image from "next/image";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { TrustTransparency } from "@/components/landing/trust-transparency";
import { RequestDemoSection } from "@/components/landing/request-demo-section";
import { AnalysisComparison } from "@/components/landing/analysis-comparison";
import {
  FileText,
  Mail,
  Check,
  ArrowRight,
  Factory,
  AlertTriangle,
  Anchor,
  AlertOctagon,
  Search,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import type { Metadata } from "next";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getServerLocale(cookieStore, headerStore);
  const t = createTranslator(locale);

  const ogLocale =
    locale === "pt" ? "pt_PT" : locale === "es" ? "es_ES" : locale === "fr" ? "fr_FR" : locale === "de" ? "de_DE" : "en_US";

  return {
    title: t("landing.metaTitle"),
    description: t("landing.metaDescription"),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: t("landing.metaTitle"),
      description: t("landing.metaDescription"),
      url: APP_URL,
      siteName: "Supply Pulse",
      locale: ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("landing.metaTitle"),
      description: t("landing.metaDescription"),
    },
  };
}

function buildFaqJsonLd(t: ReturnType<typeof createTranslator>) {
  const items = [
    { q: t("landing.faq1Q"), a: t("landing.faq1A") },
    { q: t("landing.faq2Q"), a: t("landing.faq2A") },
    { q: t("landing.faq8Q"), a: t("landing.faq8A") },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function buildSoftwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Supply Pulse",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: APP_URL,
    description:
      "Weekly AI supply chain risk reports with cited sources for monitored suppliers.",
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
        price: "29.99",
        priceCurrency: "USD",
        billingDuration: "P1M",
        description: "Up to 5 suppliers with standard AI analysis",
      },
      {
        "@type": "Offer",
        name: "Plus",
        price: "79.99",
        priceCurrency: "USD",
        billingDuration: "P1M",
        description: "Up to 5 suppliers with Deep Research AI",
      },
    ],
  };
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = getServerLocale(cookieStore, headerStore);
  const t = createTranslator(locale);

  const faqJsonLd = buildFaqJsonLd(t);
  const softwareAppJsonLd = buildSoftwareJsonLd();

  const problems = [
    {
      titleKey: "landing.problem1Title",
      descKey: "landing.problem1Desc",
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      titleKey: "landing.problem2Title",
      descKey: "landing.problem2Desc",
      icon: Anchor,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      titleKey: "landing.problem3Title",
      descKey: "landing.problem3Desc",
      icon: AlertOctagon,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  const radarSteps = [
    { titleKey: "landing.radarStep1Title", descKey: "landing.radarStep1Desc", icon: Factory },
    { titleKey: "landing.radarStep2Title", descKey: "landing.radarStep2Desc", icon: Search },
    { titleKey: "landing.radarStep3Title", descKey: "landing.radarStep3Desc", icon: Mail },
    { titleKey: "landing.radarStep4Title", descKey: "landing.radarStep4Desc", icon: ClipboardList },
  ];

  const landingPlans = [
    {
      name: t("common.free"),
      price: "$0",
      description: t("landing.supplier1"),
      badge: null,
      buttonText: t("landing.startFree"),
      buttonVariant: "outline" as const,
      features: [
        t("landing.weeklyReport"),
        t("landing.emailDelivery"),
        t("landing.pdfDownload"),
      ],
    },
    {
      name: t("common.standard"),
      price: "$29.99",
      description: t("landing.upTo5"),
      badge: null,
      buttonText: t("common.getStarted"),
      buttonVariant: "outline" as const,
      features: [
        t("pricing.standardFeature1"),
        t("pricing.standardFeature2"),
        t("pricing.standardFeature3"),
        t("pricing.standardFeature4"),
        t("landing.standardAiReports"),
      ],
    },
    {
      name: t("common.plus"),
      price: "$79.99",
      description: t("landing.upTo5"),
      badge: t("common.mostPopular"),
      buttonText: t("common.getStarted"),
      buttonVariant: "default" as const,
      features: [
        t("landing.deepResearchReports"),
        t("landing.geoFinancialRisk"),
        t("landing.fullCitations"),
        t("pricing.plusFeature5"),
        t("pricing.plusFeature6"),
        t("pricing.plusFeature9"),
      ],
    },
  ];

  const faqItems = [
    { q: t("landing.faq1Q"), a: t("landing.faq1A") },
    { q: t("landing.faq2Q"), a: t("landing.faq2A") },
    { q: t("landing.faq3Q"), a: t("landing.faq3A") },
    { q: t("landing.faq4Q"), a: t("landing.faq4A") },
    { q: t("landing.faq6Q"), a: t("landing.faq6A") },
    { q: t("landing.faq7Q"), a: t("landing.faq7A") },
    { q: t("landing.faq8Q"), a: t("landing.faq8A") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50" aria-label="Main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo size={32} />
              <span className="text-lg font-bold">{t("common.appName")}</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/pricing">{t("common.pricing")}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t("common.signIn")}</Link>
              </Button>
              <ThemeToggle />
              <PublicLanguageSwitcher />
              <Button size="sm" asChild className="whitespace-nowrap">
                <Link href="/register">{t("common.getStartedFree")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0 overflow-hidden z-0 opacity-20 pointer-events-none" aria-hidden>
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
              <Badge
                variant="outline"
                className="mb-5 border-info/30 bg-info-bg px-3 py-1 text-xs text-info sm:text-sm"
              >
                {t("landing.heroBadge")}
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-5 leading-[1.12]">
                {t("landing.heroTitle")}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                {t("landing.heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Button size="lg" asChild className="h-12 w-full px-8 text-base sm:w-auto">
                  <Link href="/register">
                    {t("landing.startFreeMonitoring")}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 w-full px-8 text-base sm:w-auto">
                  <a href="#request-demo">{t("landing.requestDemo")}</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-5">{t("landing.setupTime")}</p>
              <p className="text-sm text-muted-foreground mt-2">{t("landing.noCreditCard")}</p>
            </div>

            <div className="relative w-full">
              <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                <Image
                  src="/landing-hero.jpg"
                  alt={t("landing.heroImageAlt")}
                  width={1536}
                  height={1024}
                  className="w-full h-auto"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProductShowcase t={t} />

      {/* Business problems */}
      <section className="py-20 md:py-24 bg-muted/30" aria-labelledby="problems-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
              {t("landing.problemsLabel")}
            </Badge>
            <h2 id="problems-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t("landing.silentKillerTitle")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("landing.silentKillerSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {problems.map((problem, idx) => (
              <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${problem.bg}`}
                  >
                    <problem.icon className={`h-6 w-6 ${problem.color}`} aria-hidden />
                  </div>
                  <CardTitle className="text-xl">{t(problem.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{t(problem.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-24 bg-background" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
              {t("landing.howItWorksLabel")}
            </Badge>
            <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t("landing.radarTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("landing.radarSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {radarSteps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <step.icon className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report — single place for PDF example */}
      <section
        id="sample-report"
        className="scroll-mt-20 py-20 md:py-24 bg-slate-950 text-white"
        aria-labelledby="proof-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 id="proof-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                {t("landing.proofTitle")}
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">{t("landing.proofSubtitle")}</p>

              <ul className="space-y-4 mb-8">
                {[t("landing.proofPoint1"), t("landing.proofPoint2"), t("landing.proofPoint3")].map(
                  (point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-4 w-4 text-blue-400" aria-hidden />
                      </div>
                      <span className="text-slate-200 text-sm sm:text-base">{point}</span>
                    </li>
                  )
                )}
              </ul>

              <Button variant="secondary" size="lg" asChild className="group h-12">
                <a
                  href="/supply-chain-report-example.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="mr-2 h-4 w-4" aria-hidden />
                  {t("landing.downloadReport")}
                  <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </Button>
              <p className="text-xs text-slate-500 mt-4">{t("landing.sampleReportDesc")}</p>
            </div>

            <div className="flex justify-center">
              <a
                href="/supply-chain-report-example.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-slate-700 shadow-2xl max-w-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Image
                  src="/pdf-cover-header-preview.jpg"
                  alt={t("landing.reportCoverAlt")}
                  width={800}
                  height={1100}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 90vw, 400px"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <TrustTransparency t={t} />

      {/* Pricing */}
      <section
        id="pricing"
        className="py-20 md:py-24 bg-muted/30 scroll-mt-20"
        aria-labelledby="pricing-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t("landing.pricingSimpleTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("landing.pricingSimpleSubtitle")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("landing.pricingUsdNote")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {landingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.badge ? "border-primary shadow-lg md:scale-[1.02] z-10" : "border-border shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">{plan.badge}</Badge>
                  </div>
                )}
                <CardHeader className={plan.badge ? "pt-8" : undefined}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{t("common.perMo")}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary shrink-0" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button variant={plan.buttonVariant} size="lg" asChild className="w-full">
                    <Link href="/register">{plan.buttonText}</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <AnalysisComparison t={t} />

          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
            >
              {t("landing.viewAllPlans")}
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24 bg-background" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {t("landing.faqTitle")}
            </h2>
            <p className="text-lg text-muted-foreground">{t("landing.faqSubtitle")}</p>
          </div>

          <div className="divide-y divide-border rounded-lg border">
            {faqItems.map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between cursor-pointer px-5 sm:px-6 py-4 sm:py-5 text-left font-medium hover:bg-muted/50 transition-colors list-none">
                  <span className="pr-4 text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="px-5 sm:px-6 pb-5 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <RequestDemoSection t={t} />

      <footer className="border-t py-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={24} />
              <span className="text-sm font-semibold">{t("common.appName")}</span>
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                {t("common.pricing")}
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                {t("legal.privacyTitle")}
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                {t("legal.termsTitle")}
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                {t("legal.cookiesTitle")}
              </Link>
              <CookiePreferencesButton
                label={t("legal.cookiePreferences")}
                className="text-sm text-muted-foreground"
              />
            </div>

            <a
              href="mailto:support@supplypulse.net"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {t("landing.footerSupport")}
            </a>
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            {t("landing.footerCopyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
