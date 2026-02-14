"use client";

import { useState } from "react";
import type { Supplier } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { SupplierCard } from "@/components/supplier-card";
import { Search } from "lucide-react";

interface SupplierSearchProps {
  suppliers: Supplier[];
}

export function SupplierSearch({ suppliers }: SupplierSearchProps) {
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
          placeholder="Search by name, country, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No suppliers match your search.
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
