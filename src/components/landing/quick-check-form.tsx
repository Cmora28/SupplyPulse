"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search } from "lucide-react";

interface QuickCheckFormProps {
  buttonText: string;
  placeholder: string;
}

export function QuickCheckForm({ buttonText, placeholder }: QuickCheckFormProps) {
  const [supplierName, setSupplierName] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierName.trim()) {
      // Redirect to register with the supplier name pre-filled via query param
      // (The register page logic would need to handle this, but for now just redirecting to register is enough of a "hook")
      router.push(`/register?supplier=${encodeURIComponent(supplierName)}`);
    } else {
        router.push("/register");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="pl-9 bg-background h-11"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="h-11 px-8">
        {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
