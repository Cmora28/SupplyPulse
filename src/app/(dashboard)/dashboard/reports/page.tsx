import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { formatUtcDate } from "@/lib/date-locale";
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
import { FileText, Download, Clock } from "lucide-react";
import Link from "next/link";
import { DeleteReportButton } from "@/components/delete-report-button";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const tier = dbUser?.subscriptionTier || session.user.subscriptionTier;

  const weekLimit = tier === "PREMIUM" || tier === "ENTERPRISE" ? 12 : 4;

  const reportRuns = await prisma.reportRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: weekLimit,
    include: {
      items: {
        include: { supplier: true },
        orderBy: { supplier: { name: "asc" } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("reports.title")}</h1>
        <p className="text-muted-foreground">
          {t("reports.subtitle")}
        </p>
      </div>

      {reportRuns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t("reports.noReports")}</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              {t("reports.noReportsDesc")}
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard/suppliers">{t("reports.manageSuppliers")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportRuns.map((run, index) => {
            const successCount = run.items.filter(
              (i) => i.status === "SUCCESS"
            ).length;
            // Only allow PDF download for the most recent (latest) report run
            const isLatest = index === 0;
            const canDownload =
              isLatest && (run.status === "EMAILED" || run.status === "READY");

            return (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {t("reports.weekOf", { date: formatUtcDate(run.weekOf, "PPP", locale) })}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        <LocalDateTime iso={run.createdAt.toISOString()} preset="dateTime" />
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      {canDownload && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/api/reports/${run.id}/pdf`}>
                            <Download className="mr-1 h-3 w-3" aria-hidden />
                            {t("reports.pdf")}
                          </a>
                        </Button>
                      )}
                      {run.status === "FAILED" && (
                        <DeleteReportButton reportRunId={run.id} />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {run.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5 border-b last:border-0"
                        >
                          <span className="text-sm">{item.supplier.name}</span>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                  </div>
                  {successCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {t("reports.generatedCount", { count: successCount, total: run.items.length })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
