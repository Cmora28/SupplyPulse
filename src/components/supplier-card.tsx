"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@prisma/client";
import { riskDelta } from "@/lib/risk-score";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { MapPin, Package, Clock, Percent, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";

export type SupplierRiskSnapshot = {
  riskScore: number | null;
  priority: "P1" | "P2" | "P3" | null;
  riskFactors: string[];
};

export type SupplierCardData = Supplier & {
  latestRisk: SupplierRiskSnapshot | null;
  previousRisk: Pick<SupplierRiskSnapshot, "riskScore" | "priority"> | null;
};

interface SupplierCardProps {
  supplier: SupplierCardData;
}

const PRIORITY_STYLES: Record<"P1" | "P2" | "P3", string> = {
  P1: "bg-red-100 text-red-700 border-red-200",
  P2: "bg-amber-100 text-amber-800 border-amber-200",
  P3: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function SupplierRiskLine({
  latest,
  previous,
}: {
  latest: SupplierRiskSnapshot | null;
  previous: SupplierCardData["previousRisk"];
}) {
  const { t } = useTranslation();
  if (!latest) return null;

  if (!latest.priority || latest.riskScore == null) {
    return (
      <p className="text-xs text-muted-foreground pt-1">{t("suppliers.riskNotScored")}</p>
    );
  }

  const delta = riskDelta(latest.riskScore, previous?.riskScore);
  const priorityChanged =
    previous?.priority != null && previous.priority !== latest.priority;

  return (
    <div className="space-y-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={PRIORITY_STYLES[latest.priority]}>
          {latest.priority}
        </Badge>
        <span className="text-sm font-semibold tabular-nums">
          {t("suppliers.riskScoreValue", { score: latest.riskScore })}
        </span>
      </div>
      {delta != null && (
        <p
          className={`flex items-center gap-1 text-xs ${
            delta > 0 ? "text-red-600" : delta < 0 ? "text-emerald-600" : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : delta < 0 ? (
            <TrendingDown className="h-3.5 w-3.5" />
          ) : null}
          <span>
            {delta === 0
              ? t("suppliers.vsLastWeekSame")
              : t("suppliers.vsLastWeek", {
                  delta: delta > 0 ? `+${delta}` : String(delta),
                })}
            {priorityChanged ? ` · ${t("suppliers.wasPriority", { priority: previous?.priority ?? "" })}` : ""}
          </span>
        </p>
      )}
      {latest.riskFactors.length > 0 && (
        <p className="text-xs text-muted-foreground line-clamp-2" title={latest.riskFactors.join(" · ")}>
          {latest.riskFactors.slice(0, 3).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: t("common.error"),
          description: data.error || t("suppliers.failedToDelete"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("suppliers.supplierDeleted"),
        description: t("suppliers.supplierDeletedDesc", { name: supplier.name }),
      });
      router.refresh();
    } catch {
      toast({
        title: t("common.error"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="group relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-semibold line-clamp-1">
              {supplier.name}
            </CardTitle>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("suppliers.deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("suppliers.deleteConfirmDesc", { name: supplier.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t("suppliers.deleting") : t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{supplier.country}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{supplier.category}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{t("suppliers.leadTimeDisplay", { value: supplier.leadTimeDays })}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              <span>{t("suppliers.cogsDisplay", { value: supplier.cogsPercentage })}</span>
            </div>
          </div>
          {supplier.shippingRoute && (
            <Badge variant="outline" className="text-xs font-normal">
              {supplier.shippingRoute}
            </Badge>
          )}
          <SupplierRiskLine
            latest={supplier.latestRisk}
            previous={supplier.previousRisk}
          />
        </CardContent>
      </Card>

      <AddSupplierDialog
        supplier={supplier}
        open={editOpen}
        onOpenChange={setEditOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
