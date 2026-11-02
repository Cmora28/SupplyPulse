"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n/client";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default is dark. Ignore the stored theme until mount so server and client markup match.
  const current =
    mounted && (theme === "light" || theme === "dark" || theme === "system")
      ? theme
      : "dark";
  const Icon = current === "light" ? Sun : current === "system" ? Monitor : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={t("common.theme")}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            {t("common.themeLight")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            {t("common.themeDark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            {t("common.themeSystem")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
