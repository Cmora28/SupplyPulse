import Link from "next/link";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Supply Pulse Cookie Policy. Learn about the cookies we use and how to manage them.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t("legal.cookiesTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("legal.lastUpdated", { date: "February 2026" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {/* What are cookies */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.cookiesSection1Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.cookiesWhat")}</p>
          </section>

          {/* Cookies we use */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.cookiesSection2Title")}</h2>
            <p className="text-muted-foreground text-sm mb-4">{t("legal.cookiesWeUseIntro")}</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">{t("legal.cookiesTableName")}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t("legal.cookiesTableType")}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t("legal.cookiesTableDuration")}</th>
                    <th className="text-left py-2 font-medium">{t("legal.cookiesTablePurpose")}</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4"><code className="text-xs bg-muted px-1 py-0.5 rounded">next-auth.session-token</code></td>
                    <td className="py-2 pr-4">{t("legal.cookiesTypeEssential")}</td>
                    <td className="py-2 pr-4">{t("legal.cookies7Days")}</td>
                    <td className="py-2">{t("legal.cookiesSessionDesc")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><code className="text-xs bg-muted px-1 py-0.5 rounded">locale</code></td>
                    <td className="py-2 pr-4">{t("legal.cookiesTypeFunctional")}</td>
                    <td className="py-2 pr-4">{t("legal.cookies1Year")}</td>
                    <td className="py-2">{t("legal.cookiesLocaleDesc")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><code className="text-xs bg-muted px-1 py-0.5 rounded">_fbp, _fbc</code></td>
                    <td className="py-2 pr-4">{t("legal.cookiesTypeMarketing")}</td>
                    <td className="py-2 pr-4">{t("legal.cookiesMetaDuration")}</td>
                    <td className="py-2">{t("legal.cookiesMetaPurpose")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* No tracking */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.cookiesSection3Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.cookiesNoTracking")}</p>
          </section>

          {/* Managing cookies */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.cookiesSection4Title")}</h2>
            <p className="text-muted-foreground text-sm">{t("legal.cookiesManage")}</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">{t("legal.cookiesSection5Title")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("legal.cookiesContact")}{" "}
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
