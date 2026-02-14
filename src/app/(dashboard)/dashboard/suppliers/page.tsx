import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
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

  const userId = session.user.id;
  const tier = session.user.subscriptionTier;

  const suppliers = await prisma.supplier.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const supplierLimit = TIER_LIMITS[tier];
  const limitReached = suppliers.length >= supplierLimit;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            {suppliers.length} of{" "}
            {supplierLimit === Infinity ? "unlimited" : supplierLimit} suppliers
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
                Supplier limit reached
              </p>
              <p className="text-sm text-yellow-700">
                Upgrade your plan to monitor more suppliers.
              </p>
            </div>
            <Link href="/dashboard/billing">
              <Button size="sm" variant="outline">
                Upgrade <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No suppliers yet</h3>
            <p className="text-muted-foreground text-sm text-center mb-4">
              Add your first supplier to start receiving weekly AI-powered risk reports.
            </p>
            <AddSupplierDialog />
          </CardContent>
        </Card>
      ) : (
        <>
          <SupplierSearch suppliers={suppliers} />
        </>
      )}
    </div>
  );
}
