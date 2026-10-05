"use client";

import { useEffect, useState } from "react";
import { AddSupplierDialog } from "@/components/add-supplier-dialog";

const SESSION_KEY_PREFIX = "sp-supplier-onboarding-prompted";

function storageKey(userId: string) {
  return `${SESSION_KEY_PREFIX}-${userId}`;
}

/** Call on sign-out so the add-supplier prompt can show again on next login. */
export function clearSupplierOnboardingPrompt(userId?: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (userId) {
    sessionStorage.removeItem(storageKey(userId));
    return;
  }
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(SESSION_KEY_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
  // Legacy key from first implementation
  sessionStorage.removeItem("sp-supplier-onboarding-prompted");
}

interface FirstSupplierOnboardingProps {
  supplierCount: number;
  userId: string | null;
}

export function FirstSupplierOnboarding({
  supplierCount,
  userId,
}: FirstSupplierOnboardingProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || supplierCount >= 1) return;

    const key = storageKey(userId);
    // Clear legacy global key so older sessions don't block the prompt
    sessionStorage.removeItem("sp-supplier-onboarding-prompted");

    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setOpen(true);
  }, [supplierCount, userId]);

  if (!userId || supplierCount >= 1) {
    return null;
  }

  return (
    <AddSupplierDialog
      open={open}
      onOpenChange={setOpen}
      onClose={() => setOpen(false)}
      hideTrigger
    />
  );
}
