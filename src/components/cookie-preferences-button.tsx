"use client";

import { openCookiePreferences } from "@/lib/cookie-consent";

export function CookiePreferencesButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={`inline cursor-pointer border-0 bg-transparent p-0 font-[inherit] hover:text-foreground transition-colors ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
