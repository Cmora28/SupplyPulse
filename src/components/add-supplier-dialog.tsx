"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { Plus, Info } from "lucide-react";
import type { Supplier } from "@prisma/client";

const COUNTRIES = [
  "China",
  "India",
  "United States",
  "Germany",
  "Japan",
  "South Korea",
  "Taiwan",
  "Vietnam",
  "Thailand",
  "Mexico",
  "Brazil",
  "Indonesia",
  "Malaysia",
  "Turkey",
  "Italy",
  "United Kingdom",
  "France",
  "Canada",
  "Netherlands",
  "Bangladesh",
  "Other",
];

function FieldInfo({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={-1}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">{tooltip}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

interface AddSupplierDialogProps {
  disabled?: boolean;
  supplier?: Supplier | null;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddSupplierDialog({
  disabled,
  supplier,
  onClose,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddSupplierDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!supplier;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    country: supplier?.country || "",
    category: supplier?.category || "",
    leadTimeDays: supplier?.leadTimeDays?.toString() || "",
    cogsPercentage: supplier?.cogsPercentage?.toString() || "",
    shippingRoute: supplier?.shippingRoute || "",
    dependencies: supplier?.dependencies || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        country: formData.country,
        category: formData.category,
        leadTimeDays: parseInt(formData.leadTimeDays),
        cogsPercentage: parseFloat(formData.cogsPercentage),
        shippingRoute: formData.shippingRoute || null,
        dependencies: formData.dependencies || null,
      };

      const url = isEditing
        ? `/api/suppliers/${supplier.id}`
        : "/api/suppliers";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error || t("common.somethingWentWrong"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? t("suppliers.supplierUpdated") : t("suppliers.supplierAdded"),
        description: isEditing
          ? t("suppliers.supplierUpdatedDesc", { name: formData.name })
          : t("suppliers.supplierAddedDesc", { name: formData.name }),
      });

      setOpen(false);
      onClose?.();
      router.refresh();

      if (!isEditing) {
        setFormData({
          name: "",
          country: "",
          category: "",
          leadTimeDays: "",
          cogsPercentage: "",
          shippingRoute: "",
          dependencies: "",
        });
      }
    } catch {
      toast({
        title: t("common.error"),
        description: t("common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const trigger = !isEditing ? (
    <DialogTrigger asChild>
      <Button disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        {t("suppliers.addSupplier")}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("suppliers.editSupplier") : t("suppliers.addSupplier")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("suppliers.editDialogDesc")
              : t("suppliers.addDialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider delayDuration={200}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="name">{t("suppliers.nameLabel") + " *"}</Label>
                <FieldInfo tooltip={t("suppliers.nameTooltip")} />
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("suppliers.namePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="country">{t("suppliers.countryLabel") + " *"}</Label>
                <FieldInfo tooltip={t("suppliers.countryTooltip")} />
              </div>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("suppliers.selectCountry")} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="category">{t("suppliers.categoryLabel") + " *"}</Label>
                <FieldInfo tooltip={t("suppliers.categoryTooltip")} />
              </div>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder={t("suppliers.categoryPlaceholder")}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="leadTimeDays">{t("suppliers.leadTimeLabel") + " *"}</Label>
                  <FieldInfo tooltip={t("suppliers.leadTimeTooltip")} />
                </div>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="1"
                  value={formData.leadTimeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, leadTimeDays: e.target.value })
                  }
                  placeholder={t("suppliers.leadTimePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="cogsPercentage">{t("suppliers.cogsLabel") + " *"}</Label>
                  <FieldInfo tooltip={t("suppliers.cogsTooltip")} />
                </div>
                <Input
                  id="cogsPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.cogsPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, cogsPercentage: e.target.value })
                  }
                  placeholder={t("suppliers.cogsPlaceholder")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="shippingRoute">{t("suppliers.shippingRouteLabel")}</Label>
                <FieldInfo tooltip={t("suppliers.shippingRouteTooltip")} />
              </div>
              <Input
                id="shippingRoute"
                value={formData.shippingRoute}
                onChange={(e) =>
                  setFormData({ ...formData, shippingRoute: e.target.value })
                }
                placeholder={t("suppliers.shippingRoutePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="dependencies">{t("suppliers.dependenciesLabel")}</Label>
                <FieldInfo tooltip={t("suppliers.dependenciesTooltip")} />
              </div>
              <Textarea
                id="dependencies"
                value={formData.dependencies}
                onChange={(e) =>
                  setFormData({ ...formData, dependencies: e.target.value })
                }
                placeholder={t("suppliers.dependenciesPlaceholder")}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditing
                    ? t("suppliers.saving")
                    : t("suppliers.adding")
                  : isEditing
                  ? t("suppliers.saveChanges")
                  : t("suppliers.addSupplier")}
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
