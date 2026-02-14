"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/client";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const { data: session } = useSession();

  const handleChange = (value: string) => {
    // Persist to server if the user is logged in
    setLocale(value as Locale, !!session?.user);
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-full h-9 text-xs">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{localeFlags[locale]}</span>
            <span>{localeNames[locale]}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
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
