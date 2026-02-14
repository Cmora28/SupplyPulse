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
import { AddSupplierDialog } from "@/components/add-supplier-dialog";
import { MapPin, Package, Clock, Percent, Pencil, Trash2 } from "lucide-react";

interface SupplierCardProps {
  supplier: Supplier;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  const router = useRouter();
  const { toast } = useToast();
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
          title: "Error",
          description: data.error || "Failed to delete supplier",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Supplier deleted",
        description: `${supplier.name} has been removed.`,
      });
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
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
                    <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {supplier.name} and all
                      associated reports. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting..." : "Delete"}
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
              <span>{supplier.leadTimeDays}d</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              <span>{supplier.cogsPercentage}% COGS</span>
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
