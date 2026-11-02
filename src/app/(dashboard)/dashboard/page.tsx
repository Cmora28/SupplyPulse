import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { formatUtcDate } from "@/lib/date-locale";
import { extractSupplierRisk, type RiskLevel } from "@/lib/report-risk";
import { calculateNextReportAt } from "@/lib/schedule";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { LocalDateTime } from "@/components/local-date";
import { Factory, FileText, Crown, Plus, Download } from "lucide-react";
import Link from "next/link";
import { RunReportButton } from "@/components/run-report-button";
import { UpgradeSuccess } from "@/components/upgrade-success";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, reportDay: true, reportHour: true, nextReportAt: true },
  });
  const tier = dbUser?.subscriptionTier || session.user.subscriptionTier;

  const [supplierCount, reportRunsThisMonth, latestRun] = await Promise.all([
    prisma.supplier.count({ where: { userId } }),
    prisma.reportRun.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.reportRun.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { supplier: true },
        },
      },
    }),
  ]);

  const supplierReports = latestRun
    ? await prisma.supplierReport.findMany({
        where: {
          supplierId: { in: latestRun.items.map((item) => item.supplierId) },
          weekOf: latestRun.weekOf,
        },
        select: { supplierId: true, content: true },
      })
    : [];
  const reportBySupplier = new Map(
    supplierReports.map((report) => [report.supplierId, report.content])
  );

  const supplierLimit = TIER_LIMITS[tier];
  const userReportDay = dbUser?.reportDay ?? 1;
  const userReportHour = dbUser?.reportHour ?? 8;
  const nextReportDate = dbUser?.nextReportAt
    ? new Date(dbUser.nextReportAt)
    : calculateNextReportAt(userReportDay, userReportHour);

  const successCount = latestRun
    ? latestRun.items.filter((item) => item.status === "SUCCESS").length
    : 0;
  const canDownload =
    !!latestRun && (latestRun.status === "EMAILED" || latestRun.status === "READY");

  const riskRank: Record<RiskLevel | "failed" | "other", number> = {
    failed: 0,
    high: 1,
    medium: 2,
    low: 3,
    other: 4,
  };

  const riskRows = (latestRun?.items ?? [])
    .map((item) => {
      if (item.status === "FAILED") {
        const errorText = item.error?.replace(/\s+/g, " ").trim();
        return {
          id: item.id,
          name: item.supplier.name,
          summary: errorText
            ? errorText.length > 180
              ? `${errorText.slice(0, 179).trimEnd()}…`
              : errorText
            : t("dashboard.itemFailed"),
          risk: null as RiskLevel | null,
          status: item.status,
          rank: riskRank.failed,
        };
      }
      if (item.status !== "SUCCESS") {
        return {
          id: item.id,
          name: item.supplier.name,
          summary:
            item.status === "PROCESSING"
              ? t("dashboard.itemProcessing")
              : t("dashboard.itemPending"),
          risk: null as RiskLevel | null,
          status: item.status,
          rank: riskRank.other,
        };
      }
      const extracted = extractSupplierRisk(reportBySupplier.get(item.supplierId));
      return {
        id: item.id,
        name: item.supplier.name,
        summary: extracted.summary || t("dashboard.noAlerts"),
        risk: extracted.level,
        status: item.status,
        rank: riskRank[extracted.level],
      };
    })
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <UpgradeSuccess />
      </Suspense>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.welcomeBack", { name: session.user.name?.split(" ")[0] || "" })}
          </h1>
          <p className="text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          <LocalDateTime iso={nextReportDate.toISOString()} preset="nextReport" />
        </p>
      </div>

      {supplierCount === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.quickActionsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-3" aria-hidden />
              <h3 className="font-semibold text-lg mb-1">{t("dashboard.addFirstSupplier")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("dashboard.addFirstSupplierDesc")}
              </p>
              <Button asChild>
                <Link href="/dashboard/suppliers">
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  {t("dashboard.addSupplier")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : latestRun ? (
        <div className="relative z-0">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg" aria-hidden>
            <div className="absolute -left-8 -top-10 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -bottom-10 -right-6 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
          </div>
        <Card className="glass glass-glow relative z-10 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {t("dashboard.reportTitle", {
                    date: formatUtcDate(latestRun.weekOf, "PPP", locale),
                  })}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("dashboard.generated")}{" "}
                  <LocalDateTime iso={latestRun.createdAt.toISOString()} preset="dateTime" />
                  {" · "}
                  {t("dashboard.supplierCoverage", {
                    count: successCount,
                    total: latestRun.items.length,
                  })}
                </CardDescription>
              </div>
              <StatusBadge status={latestRun.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-card">
              {riskRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.summary}</p>
                  </div>
                  {row.risk ? (
                    <StatusBadge risk={row.risk} />
                  ) : (
                    <StatusBadge status={row.status} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/reports">{t("dashboard.openReport")}</Link>
              </Button>
              {canDownload && (
                <Button variant="outline" asChild>
                  <a href={`/api/reports/${latestRun.id}/pdf`}>
                    <Download className="mr-2 h-4 w-4" aria-hidden />
                    {t("dashboard.downloadPdf")}
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>
          {t("dashboard.totalSuppliers")}{" "}
          <strong className="font-semibold text-foreground">
            {supplierCount}
            {" / "}
            {supplierLimit === Infinity ? "∞" : supplierLimit}
          </strong>
        </span>
        <span>
          {t("dashboard.reportsThisMonth")}{" "}
          <strong className="font-semibold text-foreground">{reportRunsThisMonth}</strong>
        </span>
        <span className="inline-flex items-center gap-2">
          {t("dashboard.currentPlan")}
          <StatusBadge tier={tier} />
          {tier !== "ENTERPRISE" && (
            <Button variant="link" asChild className="h-auto p-0 text-xs">
              <Link href="/dashboard/billing">{t("common.upgrade")}</Link>
            </Button>
          )}
        </span>
      </div>

      {supplierCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.quickActionsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/suppliers">
                  <Factory className="mr-2 h-4 w-4" aria-hidden />
                  {t("dashboard.manageSuppliers")}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/reports">
                  <FileText className="mr-2 h-4 w-4" aria-hidden />
                  {t("dashboard.viewReports")}
                </Link>
              </Button>
              {tier !== "ENTERPRISE" && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/billing">
                    <Crown className="mr-2 h-4 w-4" aria-hidden />
                    {t("dashboard.upgradePlan")}
                  </Link>
                </Button>
              )}
              {session.user.isAdmin && <RunReportButton />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
