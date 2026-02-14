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
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
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
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? "Supplier updated" : "Supplier added",
        description: `${formData.name} has been ${isEditing ? "updated" : "added"} successfully.`,
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
        title: "Error",
        description: "Something went wrong. Please try again.",
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
        Add Supplier
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your supplier information."
              : "Add a new supplier to monitor in your weekly reports."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Supplier Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Acme Electronics"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData.country}
              onValueChange={(value) =>
                setFormData({ ...formData, country: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
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
            <Label htmlFor="category">Product Category *</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Semiconductors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days) *</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="1"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: e.target.value })
                }
                placeholder="e.g., 30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cogsPercentage">COGS % *</Label>
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
                placeholder="e.g., 15.5"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingRoute">Shipping Route</Label>
            <Input
              id="shippingRoute"
              value={formData.shippingRoute}
              onChange={(e) =>
                setFormData({ ...formData, shippingRoute: e.target.value })
              }
              placeholder="e.g., Shanghai → Rotterdam → Chicago"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependencies">Key Dependencies</Label>
            <Textarea
              id="dependencies"
              value={formData.dependencies}
              onChange={(e) =>
                setFormData({ ...formData, dependencies: e.target.value })
              }
              placeholder="Describe any key dependencies, single-source components, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                ? "Save Changes"
                : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
