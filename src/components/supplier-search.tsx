"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SupplierCard, type SupplierCardData } from "@/components/supplier-card";
import { useTranslation } from "@/i18n/client";
import { Search } from "lucide-react";

interface SupplierSearchProps {
  suppliers: SupplierCardData[];
}

export function SupplierSearch({ suppliers }: SupplierSearchProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("suppliers.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("suppliers.noSearchResults")}
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      )}
    </div>
  );
}
