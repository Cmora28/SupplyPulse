import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { format } from "date-fns";
import { calculateNextReportAt } from "@/lib/schedule";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, FileText, CalendarClock, Crown, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RunReportButton } from "@/components/run-report-button";
import { UpgradeSuccess } from "@/components/upgrade-success";
import { Suspense } from "react";

const ADMIN_EMAIL = "lopezhk@gmail.com";

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

  const supplierLimit = TIER_LIMITS[tier];
  const userReportDay = dbUser?.reportDay ?? 1;
  const userReportHour = dbUser?.reportHour ?? 8;
  const nextReportDate = dbUser?.nextReportAt
    ? new Date(dbUser.nextReportAt)
    : calculateNextReportAt(userReportDay, userReportHour);

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    READY: "bg-green-100 text-green-700",
    EMAILED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <UpgradeSuccess />
      </Suspense>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dashboard.welcomeBack", { name: session.user.name?.split(" ")[0] || "" })}
        </h1>
        <p className="text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalSuppliers")}</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierCount}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {supplierLimit === Infinity ? "∞" : supplierLimit}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.reportsThisMonth")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportRunsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.nextReport")}</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(nextReportDate, "MMM d")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`schedule.days.${userReportDay}`)} {String(userReportHour).padStart(2, "0")}:00 UTC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.currentPlan")}</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tier}</div>
            {tier !== "ENTERPRISE" && (
              <Link href="/dashboard/billing">
                <Button variant="link" className="p-0 h-auto text-xs">
                  {t("common.upgrade")}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.quickActions")}</CardTitle>
          <CardDescription>{t("dashboard.quickActionsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierCount === 0 ? (
            <div className="text-center py-6">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">{t("dashboard.addFirstSupplier")}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {t("dashboard.addFirstSupplierDesc")}
              </p>
              <Link href="/dashboard/suppliers">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("dashboard.addSupplier")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/suppliers">
                <Button variant="outline">
                  <Factory className="mr-2 h-4 w-4" />
                  {t("dashboard.manageSuppliers")}
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  {t("dashboard.viewReports")}
                </Button>
              </Link>
              {tier !== "ENTERPRISE" && (
                <Link href="/dashboard/billing">
                  <Button variant="outline">
                    <Crown className="mr-2 h-4 w-4" />
                    {t("dashboard.upgradePlan")}
                  </Button>
                </Link>
              )}
              {session.user.email === ADMIN_EMAIL && <RunReportButton />}
            </div>
          )}
        </CardContent>
      </Card>

      {latestRun && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("dashboard.latestReportRun")}</CardTitle>
                <CardDescription>
                  {t("dashboard.weekOf", { date: format(latestRun.weekOf, "MMMM d, yyyy") })}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={statusColors[latestRun.status] || ""}
              >
                {latestRun.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {latestRun.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm font-medium">
                    {item.supplier.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={statusColors[item.status] || ""}
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Link href="/dashboard/reports" className="mt-4 inline-block">
              <Button variant="link" className="p-0">
                {t("dashboard.viewAllReports")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
