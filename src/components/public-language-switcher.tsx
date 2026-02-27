"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, localeFlags, type Locale, DEFAULT_LOCALE } from "@/i18n";
import { useTranslation } from "@/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A compact language switcher for public pages.
 * Updates both the LanguageProvider context (for client components)
 * and the cookie (for server components), then refreshes.
 */
export function PublicLanguageSwitcher() {
  const router = useRouter();
  const { locale: ctxLocale, setLocale: setCtxLocale } = useTranslation();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocale(ctxLocale);
  }, [ctxLocale]);

  const handleChange = (value: string) => {
    const newLocale = value as Locale;
    setLocale(newLocale);
    setCtxLocale(newLocale);
    router.refresh();
  };

  // Prevent hydration mismatch: render a placeholder until mounted
  if (!mounted) {
    return (
      <div className="w-[52px] h-9" />
    );
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-auto gap-1 px-2 text-xs border-none bg-transparent hover:bg-muted/50">
        <SelectValue>
          <span className="flex items-center gap-1">
            <span>{localeFlags[locale]}</span>
            <span className="uppercase text-[10px] font-medium">{locale}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc} className="text-xs">
            <span className="flex items-center gap-1.5">
              <span>{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
