import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Supply Pulse Terms of Service. Read the terms and conditions for using our platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-lg font-bold">{t("common.appName")}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t("legal.termsTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.lastUpdated", { date: "February 2026" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection1Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsAcceptance")}</p>
          </section>

          {/* 2. Service Description */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection2Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsServiceDesc")}</p>
          </section>

          {/* 3. Account Responsibilities */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection3Title")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.termsAccount1")}</li>
              <li>{t("legal.termsAccount2")}</li>
              <li>{t("legal.termsAccount3")}</li>
              <li>{t("legal.termsAccount4")}</li>
            </ul>
          </section>

          {/* 4. Subscription and Billing */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection4Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsBilling")}</p>
          </section>

          {/* 5. AI-Generated Content */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection5Title")}</h2>
            <p className="text-muted-foreground text-sm font-medium">{t("legal.termsAiDisclaimer")}</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm mt-2">
              <li>{t("legal.termsAi1")}</li>
              <li>{t("legal.termsAi2")}</li>
              <li>{t("legal.termsAi3")}</li>
              <li>{t("legal.termsAi4")}</li>
            </ul>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection6Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsIP")}</p>
          </section>

          {/* 7. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection7Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsLiability")}</p>
          </section>

          {/* 8. Termination */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection8Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsTermination")}</p>
          </section>

          {/* 9. Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection9Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsChanges")}</p>
          </section>

          {/* 10. Governing Law */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection10Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.termsGoverning")}</p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.termsSection11Title")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("legal.termsContact")}{" "}
              <a href="mailto:support@supplypulse.net" className="text-primary hover:underline">
                support@supplypulse.net
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
