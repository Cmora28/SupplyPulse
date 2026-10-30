import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createTranslator, getServerLocale } from "@/i18n";
import { TIER_LIMITS } from "@/lib/tier-limits";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { SupplierSearch } from "@/components/supplier-search";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Factory, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const locale = getServerLocale(cookies(), headers());
  const t = createTranslator(locale);

  const userId = session.user.id;

  const [dbUser, suppliers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    }),
    prisma.supplier.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        reports: {
          orderBy: { weekOf: "desc" },
          take: 2,
          select: {
            riskScore: true,
            priority: true,
            riskFactors: true,
          },
        },
      },
    }),
  ]);
  const tier = dbUser?.subscriptionTier || session.user.subscriptionTier;

  const supplierLimit = TIER_LIMITS[tier];
  const limitReached = suppliers.length >= supplierLimit;
  const cardSuppliers = suppliers.map(({ reports, ...supplier }) => {
    const latest = reports[0];
    const previous = reports[1];
    return {
      ...supplier,
      latestRisk: latest
        ? {
            riskScore: latest.riskScore,
            priority: latest.priority,
            riskFactors: latest.riskFactors,
          }
        : null,
      previousRisk: previous
        ? { riskScore: previous.riskScore, priority: previous.priority }
        : null,
    };
  });
  const limitDisplay = supplierLimit === Infinity ? t("common.unlimited") : String(supplierLimit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("suppliers.title")}</h1>
          <p className="text-muted-foreground">
            {t("suppliers.count", { count: cardSuppliers.length, limit: limitDisplay })}
          </p>
        </div>
        <AddSupplierDialog disabled={limitReached} />
      </div>

      {limitReached && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {t("suppliers.limitReached")}
              </p>
              <p className="text-sm text-yellow-700">
                {t("suppliers.limitReachedDesc")}
              </p>
            </div>
            <Link href="/dashboard/billing">
              <Button size="sm" variant="outline">
                {t("common.upgrade")} <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {cardSuppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t("suppliers.noSuppliers")}</h3>
            <p className="text-muted-foreground text-sm text-center mb-4">
              {t("suppliers.noSuppliersDesc")}
            </p>
            <AddSupplierDialog />
          </CardContent>
        </Card>
      ) : (
        <SupplierSearch suppliers={cardSuppliers} />
      )}
    </div>
  );
}
