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
  HelpCircle,
  TrendingUp,
  AlertOctagon,
  Search,
  Clock
} from "lucide-react";
import type { Metadata } from "next";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";
import { FeatureSection } from "@/components/landing/feature-section";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

export const metadata: Metadata = {
  title: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring",
  description:
    "Proactive supply chain risk monitoring. Detect disruptions, assess supplier risks, and receive actionable intelligence with cited sources.",
  alternates: {
    canonical: "/",
  },
};

// FAQ data for JSON-LD (English only for structured data)
const FAQ_ITEMS = [
  {
    question: "What is supply chain risk monitoring?",
    answer: "Supply chain risk monitoring is the continuous process of identifying, assessing, and tracking potential threats to your supply chain.",
  },
  // ... (Keeping JSON-LD short for brevity in file, but full content is in UI)
];

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Supply Pulse",
  url: APP_URL,
  description: "AI-powered supply chain risk monitoring platform.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Standard", price: "29", priceCurrency: "USD" },
    { "@type": "Offer", name: "Premium", price: "199", priceCurrency: "USD" },
  ],
};

export default function LandingPage() {
  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  // Stats for Problem Section
  const problemStats = [
    { title: t("landing.problem1Title"), desc: t("landing.problem1Desc"), icon: AlertOctagon },
    { title: t("landing.problem2Title"), desc: t("landing.problem2Desc"), icon: Clock },
    { title: t("landing.problem3Title"), desc: t("landing.problem3Desc"), icon: Search },
  ];

  const plans = [
    {
      name: t("common.free"),
      price: "$0",
      description: t("landing.supplier1"),
      badge: null,
      highlight: null,
      features: [t("landing.weeklyReport"), t("landing.emailDelivery"), t("landing.pdfDownload")],
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
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />

      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50 supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight">{t("common.appName")}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4">
                <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t("common.pricing")}
                </Link>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t("common.signIn")}
                </Link>
              </div>
              <PublicLanguageSwitcher />
              <Link href="/register">
                <Button size="sm" className="font-semibold">
                  {t("common.getStartedFree")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-32">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-100/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-8 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary text-sm font-medium rounded-full">
            ✨ {t("landing.heroTitle")}
          </Badge>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-8 max-w-4xl mx-auto leading-[1.1]">
            {t("landing.heroTitle")}
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                {t("landing.heroCta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                {t("landing.heroSecondaryCta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t("landing.problemTitle")}</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">{t("landing.problemSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {problemStats.map((stat, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <stat.icon className="h-10 w-10 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-3">{stat.title}</h3>
                <p className="text-slate-400 leading-relaxed">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t("landing.howItWorks")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.howItWorksSubtitle")}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: t("landing.step1"),
                title: t("landing.step1Title"),
                desc: t("landing.step1Desc"),
                icon: Factory
              },
              {
                step: t("landing.step2"),
                title: t("landing.step2Title"),
                desc: t("landing.step2Desc"),
                icon: TrendingUp
              },
              {
                step: t("landing.step3"),
                title: t("landing.step3Title"),
                desc: t("landing.step3Desc"),
                icon: FileText
              }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="mb-6 relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <item.icon className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-3 -right-3 bg-card border shadow-sm px-2 py-0.5 rounded-full text-xs font-bold text-muted-foreground">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 1: Monitoring */}
      <FeatureSection
        title={t("landing.deepDive1Title")}
        description={t("landing.deepDive1Desc")}
        points={[t("landing.deepDive1Point1"), t("landing.deepDive1Point2"), t("landing.deepDive1Point3")]}
        icon={<Zap className="h-4 w-4" />}
        imageSide="right"
      >
        <div className="bg-slate-900 p-8 min-h-[300px] flex items-center justify-center">
          {/* Abstract visual for monitoring */}
          <div className="relative w-full max-w-sm">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-500/20 blur-2xl" />
            <div className="relative bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-300 font-mono">LIVE MONITORING</span>
                </div>
                <span className="text-xs text-slate-500">14:02 UTC</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded border border-slate-600/50">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <div className="h-2 bg-slate-600 rounded w-24" />
                    <div className="ml-auto h-2 bg-green-500/50 rounded w-8" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FeatureSection>

      {/* Feature 2: Deep Research */}
      <FeatureSection
        title={t("landing.deepDive2Title")}
        description={t("landing.deepDive2Desc")}
        points={[t("landing.deepDive2Point1"), t("landing.deepDive2Point2"), t("landing.deepDive2Point3")]}
        icon={<Search className="h-4 w-4" />}
        imageSide="left"
      >
        <div className="bg-white p-8 min-h-[300px] flex flex-col gap-4 border-l-4 border-primary/20">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Search className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-2 w-full">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-20 bg-slate-50 rounded w-full p-3 text-xs text-slate-500 font-mono">
                Searching 50+ databases...<br/>
                Found 12 matching records...<br/>
                Verifying entity "Acme Corp"...<br/>
                <span className="text-green-600">✓ Confirmed match</span>
              </div>
            </div>
          </div>
        </div>
      </FeatureSection>

      {/* Feature 3: Reporting */}
      <FeatureSection
        title={t("landing.deepDive3Title")}
        description={t("landing.deepDive3Desc")}
        points={[t("landing.deepDive3Point1"), t("landing.deepDive3Point2"), t("landing.deepDive3Point3")]}
        icon={<FileText className="h-4 w-4" />}
        imageSide="right"
      >
        <div className="bg-slate-50 p-8 min-h-[300px] flex items-center justify-center">
          <div className="w-[200px] aspect-[1/1.4] bg-white shadow-xl rounded-sm border border-slate-200 p-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <div className="h-4 w-2/3 bg-slate-800 mb-4" />
            <div className="space-y-2">
              <div className="h-2 bg-slate-200 w-full" />
              <div className="h-2 bg-slate-200 w-full" />
              <div className="h-2 bg-slate-200 w-4/5" />
            </div>
            <div className="mt-6 p-2 bg-red-50 rounded border border-red-100">
              <div className="h-2 w-1/3 bg-red-200 mb-1" />
              <div className="h-1.5 w-full bg-red-100" />
            </div>
          </div>
        </div>
      </FeatureSection>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.pricingSubtitle")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col h-full ${
                  plan.popular
                    ? "border-primary shadow-xl scale-105 z-10"
                    : "border-border shadow-sm hover:shadow-md transition-shadow"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium shadow-md">
                    {t("common.mostPopular")}
                  </div>
                )}
                <CardContent className="pt-8 flex-1">
                  <h3 className="font-semibold text-xl mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{t("common.perMo")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 pb-6 border-b">
                    {plan.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 text-green-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Link href={plan.name === t("common.enterprise") ? "mailto:sales@supplypulse.net" : "/register"}>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                    >
                      {plan.name === t("common.enterprise") ? t("common.contactSales") : t("common.getStarted")}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t("landing.faqTitle")}</h2>
            <p className="text-muted-foreground">{t("landing.faqSubtitle")}</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group border rounded-lg bg-card open:ring-1 ring-primary/20">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-medium">
                  <span className="pr-8">{t(faq.qKey)}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </span>
                </summary>
                <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed">
                  {t(faq.aKey)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-primary-foreground/80 text-xl mb-10 max-w-2xl mx-auto">
            {t("landing.ctaSubtitle")}
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-semibold text-primary shadow-xl">
              {t("common.getStartedFree")} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="mt-6 text-sm text-primary-foreground/60">
            {t("landing.noCreditCard")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-lg font-bold text-slate-900">{t("common.appName")}</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">{t("legal.privacyTitle")}</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">{t("legal.termsTitle")}</Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">{t("legal.cookiesTitle")}</Link>
              <a href="mailto:support@supplypulse.net" className="hover:text-foreground transition-colors flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t("landing.footerSupport")}
              </a>
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
