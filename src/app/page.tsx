import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { QuickCheckForm } from "@/components/landing/quick-check-form";
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
  Globe,
  ChevronDown,
} from "lucide-react";
import type { Metadata } from "next";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

export const metadata: Metadata = {
  title: "Supply Pulse - Prevent Supply Chain Disruptions",
  description:
    "Monitor critical suppliers 24/7. Get alerted to financial, geopolitical, and operational risks before they impact your business.",
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
    question: "Can I try Supply Pulse for free?",
    answer:
      "Yes. The Free plan lets you monitor 1 supplier with full weekly AI risk reports, email delivery, and PDF downloads — no credit card required.",
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
      name: "Plus",
      price: "79.99",
      priceCurrency: "USD",
      billingDuration: "P1M",
      description: "Deep Research AI for up to 5 suppliers",
    },
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
    { step: "1", titleKey: "landing.radarStep1Title", descKey: "landing.radarStep1Desc", icon: Factory },
    { step: "2", titleKey: "landing.radarStep2Title", descKey: "landing.radarStep2Desc", icon: Search },
    { step: "3", titleKey: "landing.radarStep3Title", descKey: "landing.radarStep3Desc", icon: Mail },
  ];

  // Only showing Free and Plus for simplicity as per plan
  const simplePlans = [
    {
      name: t("common.free"),
      price: "$0",
      description: t("landing.supplier1"),
      badge: null,
      highlight: null,
      buttonText: t("landing.startFree"),
      buttonVariant: "outline" as const,
      features: [
        t("landing.weeklyReport"),
        t("landing.emailDelivery"),
        t("landing.pdfDownload"),
      ],
    },
    {
      name: t("common.plus"),
      price: "$79.99",
      description: t("landing.upTo5"),
      badge: t("common.mostPopular"),
      highlight: t("landing.deepResearchDetail"),
      buttonText: t("common.getStarted"),
      buttonVariant: "default" as const,
      features: [
        t("landing.everythingInFree"),
        t("landing.deepResearchReports"),
        t("landing.geoFinancialRisk"),
        t("landing.fullCitations"),
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
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
              <Link href="/pricing" className="hidden sm:block">
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

      {/* Hero Section: The "Wake Up" Call */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-950 text-white">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-6 px-3 py-1 text-blue-300 border-blue-800 bg-blue-900/30">
                {t("landing.heroBadge")}
              </Badge>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                {t("landing.heroTitle")}
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed">
                {t("landing.heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8 bg-blue-600 hover:bg-blue-700 border-none">
                    {t("landing.startFreeMonitoring")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="/supply-chain-report-example.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-base px-8 bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" /> {t("landing.viewSampleReport")}
                  </Button>
                </a>
              </div>
              <p className="text-sm text-slate-400 mt-4">
                {t("landing.setupTime")}
              </p>
            </div>
            
            {/* Visual: Split Screen "Risk Alert" vs "Dashboard" */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-xl border border-slate-800 bg-slate-900/50 shadow-2xl p-6 backdrop-blur-sm">
                {/* Mockup content */}
                <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div className="ml-auto text-xs text-slate-500 font-mono">supplypulse.net</div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-400">Critical Alert: Supplier Insolvency Risk</h4>
                      <p className="text-xs text-slate-400 mt-1">Detected: High probability of bankruptcy for key electronics supplier in Shenzhen region based on late filings and legal notices.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Factory className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Global Tech Components</div>
                        <div className="text-xs text-slate-500">Shenzhen, CN</div>
                      </div>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/20">Risk Score: 8.5/10</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Factory className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-200">Pacific Logistics Ltd</div>
                        <div className="text-xs text-slate-500">Los Angeles, US</div>
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20">Risk Score: 6.2/10</Badge>
                  </div>
                </div>
              </div>
              
              {/* Floating "Notification" */}
              <div className="absolute -bottom-6 -left-6 bg-white text-slate-900 p-4 rounded-lg shadow-xl border border-slate-200 max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">New Risk Report</div>
                    <div className="text-xs text-slate-500 mt-1">Found 3 new potential disruptions in your supply chain this week.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Trust Bar */}
      <section className="py-12 bg-muted/50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: t("landing.stat1Value"), label: t("landing.stat1Label") },
              { value: t("landing.stat2Value"), label: t("landing.stat2Label") },
              { value: t("landing.stat3Value"), label: t("landing.stat3Label") },
              { value: t("landing.stat4Value"), label: t("landing.stat4Label") },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The "Silent Killer" Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground">
              {t("landing.silentKillerTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("landing.silentKillerSubtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {problems.map((problem, idx) => (
              <Card key={idx} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${problem.bg}`}>
                    <problem.icon className={`h-6 w-6 ${problem.color}`} />
                  </div>
                  <CardTitle className="text-xl">{t(problem.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(problem.descKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-Page CTA Strip */}
      <section className="py-10 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-lg md:text-xl font-medium mb-6">
            {t("landing.midCtaText")}
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-base px-8">
              {t("landing.startFreeMonitoring")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* The "Radar" Solution */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
              {t("landing.howItWorksLabel")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {t("landing.radarTitle")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("landing.radarSubtitle")}
            </p>
          </div>

          <div className="relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent -translate-y-1/2" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {radarSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center bg-background p-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center mb-6 shadow-sm">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{t(step.titleKey)}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    {t(step.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The "Proof" Section */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl font-bold tracking-tight mb-6">
                {t("landing.proofTitle")}
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                {t("landing.proofSubtitle")}
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  t("landing.proofPoint1"),
                  t("landing.proofPoint2"),
                  t("landing.proofPoint3"),
                ].map((point, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-slate-200">{point}</span>
                  </li>
                ))}
              </ul>
              
              <a
                href="/supply-chain-report-example.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="lg" className="group">
                  <FileText className="mr-2 h-4 w-4" />
                  {t("landing.downloadReport")}
                  <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Button>
              </a>
            </div>
            
            {/* 3D Paper Effect for PDF */}
            <div className="order-1 lg:order-2 flex justify-center perspective-1000">
              <div className="relative group cursor-pointer transition-transform transform hover:-translate-y-2 duration-500">
                <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity" />
                <div className="relative w-[300px] sm:w-[380px] aspect-[1/1.4] bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-200 rotate-y-12 rotate-x-6 transform-style-3d">
                  {/* PDF Cover Mockup Content */}
                  <div className="h-full flex flex-col">
                    <div className="bg-slate-900 p-6 text-white h-1/3 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Globe className="h-32 w-32" />
                      </div>
                      <div className="flex justify-between items-start z-10">
                        <Logo size={24} />
                        <span className="text-xs font-mono opacity-70">CONFIDENTIAL</span>
                      </div>
                      <div className="z-10">
                        <div className="text-xs font-semibold tracking-wider uppercase text-blue-400 mb-1">Weekly Risk Report</div>
                        <h3 className="text-2xl font-serif">Global Supply Chain<br/>Risk Analysis</h3>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex-1 relative">
                        <div className="space-y-4 opacity-60">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                            <div className="h-32 bg-slate-200 rounded w-full mt-6 border border-slate-300"></div>
                            <div className="flex gap-4 mt-2">
                                <div className="h-20 bg-red-100 rounded flex-1 border border-red-200"></div>
                                <div className="h-20 bg-green-100 rounded flex-1 border border-green-200"></div>
                            </div>
                        </div>
                        {/* Overlay Badge */}
                        <div className="absolute bottom-8 right-8">
                            <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                PDF DOCUMENT
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {t("landing.faqTitle")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.faqSubtitle")}
            </p>
          </div>

          <div className="divide-y divide-border rounded-lg border">
            {[
              { q: t("landing.faq1Q"), a: t("landing.faq1A") },
              { q: t("landing.faq2Q"), a: t("landing.faq2A") },
              { q: t("landing.faq3Q"), a: t("landing.faq3A") },
              { q: t("landing.faq4Q"), a: t("landing.faq4A") },
              { q: t("landing.faq8Q"), a: t("landing.faq8A") },
            ].map((faq, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left font-medium hover:bg-muted/50 transition-colors">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Simple Pricing */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {t("landing.pricingSimpleTitle")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("landing.pricingSimpleSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {simplePlans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative flex flex-col ${plan.name === t("common.plus") ? 'border-primary shadow-lg scale-105 z-10' : 'border-border shadow-sm'}`}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 sm:translate-x-0 sm:right-8">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{t("common.perMo")}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Link href="/register" className="w-full">
                    <Button variant={plan.buttonVariant} size="lg" className="w-full">
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 group">
              {t("landing.viewAllPlans")} <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            {t("landing.finalCtaTitle")}
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            {t("landing.finalCtaSubtitle")}
          </p>
          
          <QuickCheckForm 
            buttonText={t("landing.checkRisk")} 
            placeholder={t("landing.enterSupplier")} 
          />
          
          <p className="text-xs text-muted-foreground mt-6">
            {t("landing.noCreditCard")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="text-sm font-semibold">{t("common.appName")}</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                {t("common.pricing")}
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                {t("legal.privacyTitle")}
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                {t("legal.termsTitle")}
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <a
                href="mailto:support@supplypulse.net"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {t("landing.footerSupport")}
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            {t("landing.footerCopyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
