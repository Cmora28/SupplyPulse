"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { locales, localeNames, localeFlags, type Locale, DEFAULT_LOCALE } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALE_STORAGE_KEY = "supplypulse-locale";
const LOCALE_COOKIE_NAME = "locale";

/**
 * A compact language switcher for public (server-rendered) pages.
 * Sets the cookie and reloads the page so the server component
 * picks up the new locale via getServerLocale().
 */
export function PublicLanguageSwitcher() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  // Read current locale from cookie/localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && locales.includes(stored as Locale)) {
      setLocale(stored as Locale);
      return;
    }
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`));
    if (cookie) {
      const val = cookie.split("=")[1];
      if (locales.includes(val as Locale)) {
        setLocale(val as Locale);
        return;
      }
    }
    // Detect from browser
    const lang = navigator.language?.substring(0, 2).toLowerCase();
    if (lang && locales.includes(lang as Locale)) {
      setLocale(lang as Locale);
    }
  }, []);

  const handleChange = (value: string) => {
    const newLocale = value as Locale;
    setLocale(newLocale);

    // Persist to cookie and localStorage
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;

    // Refresh the page so the server component re-renders with the new locale
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
