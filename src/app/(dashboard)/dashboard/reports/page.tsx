import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const statusConfig: Record<string, { key: string; className: string }> = {
    PENDING: { key: "reports.statusPending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    PROCESSING: { key: "reports.statusProcessing", className: "bg-blue-100 text-blue-700 border-blue-200" },
    READY: { key: "reports.statusReady", className: "bg-green-100 text-green-700 border-green-200" },
    EMAILED: { key: "reports.statusEmailed", className: "bg-green-100 text-green-700 border-green-200" },
    FAILED: { key: "reports.statusFailed", className: "bg-red-100 text-red-700 border-red-200" },
    SUCCESS: { key: "reports.statusSuccess", className: "bg-green-100 text-green-700 border-green-200" },
  };

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
            <Link href="/dashboard/suppliers" className="mt-4">
              <Button variant="outline">{t("reports.manageSuppliers")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportRuns.map((run, index) => {
            const status = statusConfig[run.status] || statusConfig.PENDING;
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
                        {t("reports.weekOf", { date: format(run.weekOf, "MMMM d, yyyy") })}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(run.createdAt, "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={status.className}>
                        {t(status.key)}
                      </Badge>
                      {canDownload && (
                        <a href={`/api/reports/${run.id}/pdf`}>
                          <Button size="sm" variant="outline">
                            <Download className="mr-1 h-3 w-3" />
                            {t("reports.pdf")}
                          </Button>
                        </a>
                      )}
                      {run.status === "FAILED" && (
                        <DeleteReportButton reportRunId={run.id} />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {run.items.map((item) => {
                      const itemStatus =
                        statusConfig[item.status] || statusConfig.PENDING;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5 border-b last:border-0"
                        >
                          <span className="text-sm">{item.supplier.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${itemStatus.className}`}
                          >
                            {t(itemStatus.key)}
                          </Badge>
                        </div>
                      );
                    })}
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
