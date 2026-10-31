"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@prisma/client";
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
import { MapPin, Package, Clock, Percent, Pencil, Trash2 } from "lucide-react";

interface SupplierCardProps {
  supplier: Supplier;
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
            <div className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label={t("suppliers.editNamed", { name: supplier.name })}
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    aria-label={t("suppliers.deleteNamed", { name: supplier.name })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
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
