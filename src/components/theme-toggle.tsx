"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default is dark. Ignore resolvedTheme until mount so server and client markup match.
  const isDark = !mounted || resolvedTheme !== "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      aria-label={isDark ? t("common.switchToLight") : t("common.switchToDark")}
      onClick={() => {
        const dark = document.documentElement.classList.contains("dark");
        setTheme(dark ? "light" : "dark");
      }}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
