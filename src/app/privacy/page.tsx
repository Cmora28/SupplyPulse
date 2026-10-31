import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Supply Pulse Privacy Policy. Learn how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t("legal.privacyTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.lastUpdated", { date: t("legal.updatedDate") })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-muted-foreground leading-relaxed">{t("legal.privacyIntro")}</p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection1Title")}</h2>
            <h3 className="text-base font-medium mt-4 mb-2">{t("legal.privacyAccountDataTitle")}</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.privacyAccountData1")}</li>
              <li>{t("legal.privacyAccountData2")}</li>
              <li>{t("legal.privacyAccountData3")}</li>
              <li>{t("legal.privacyAccountData4")}</li>
            </ul>
            <h3 className="text-base font-medium mt-4 mb-2">{t("legal.privacySupplierDataTitle")}</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.privacySupplierData1")}</li>
              <li>{t("legal.privacySupplierData2")}</li>
            </ul>
            <h3 className="text-base font-medium mt-4 mb-2">{t("legal.privacyAutoDataTitle")}</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.privacyAutoData1")}</li>
              <li>{t("legal.privacyAutoData2")}</li>
            </ul>
          </section>

          {/* 2. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection2Title")}</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.privacyUse1")}</li>
              <li>{t("legal.privacyUse2")}</li>
              <li>{t("legal.privacyUse3")}</li>
              <li>{t("legal.privacyUse4")}</li>
              <li>{t("legal.privacyUse5")}</li>
            </ul>
          </section>

          {/* 3. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection3Title")}</h2>
            <p className="text-muted-foreground text-sm mb-3">{t("legal.privacyThirdPartyIntro")}</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm">
              <li><strong>Perplexity</strong> — {t("legal.privacyThirdParty1")}</li>
              <li><strong>Resend</strong> — {t("legal.privacyThirdParty2")}</li>
              <li><strong>Polar</strong> — {t("legal.privacyThirdParty3")}</li>
              <li><strong>Meta (Facebook)</strong> — {t("legal.privacyThirdParty4")}</li>
              <li><strong>Vercel</strong> ({t("legal.processorHosting")}) — {t("legal.privacyThirdParty5")}</li>
              <li><strong>Railway</strong> ({t("legal.processorData")}) — {t("legal.privacyThirdParty6")}</li>
              <li><strong>Cloudflare</strong> ({t("legal.processorTurnstile")}) — {t("legal.privacyThirdParty7")}</li>
            </ul>
          </section>

          {/* 4. Cookies */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection4Title")}</h2>
            <p className="text-muted-foreground text-sm mb-3">{t("legal.privacyCookiesIntro")}</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">next-auth.session-token</code> — {t("legal.privacyCookie1")}</li>
              <li><code className="text-xs bg-muted px-1 py-0.5 rounded">locale</code> — {t("legal.privacyCookie2")}</li>
              <li>{t("legal.privacyCookie3")}</li>
            </ul>
            <p className="text-muted-foreground text-sm mt-2">{t("legal.privacyCookiesNoTracking")}</p>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection5Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.privacyRetention")}</p>
          </section>

          {/* 6. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection6Title")}</h2>
            <p className="text-muted-foreground text-sm mb-3">{t("legal.privacyRightsIntro")}</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
              <li>{t("legal.privacyRight1")}</li>
              <li>{t("legal.privacyRight2")}</li>
              <li>{t("legal.privacyRight3")}</li>
              <li>{t("legal.privacyRight4")}</li>
              <li>{t("legal.privacyRight5")}</li>
            </ul>
            <p className="text-muted-foreground text-sm mt-2">{t("legal.privacyRightsDelete")}</p>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection7Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.privacySecurity")}</p>
          </section>

          {/* 8. International Data */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection8Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.privacyInternational")}</p>
          </section>

          {/* 9. Changes */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection9Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.privacyChanges")}</p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.privacySection10Title")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("legal.privacyContact")}{" "}
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
