import { format } from "date-fns";
import { de, enUS, es, fr, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import type { Locale } from "@/i18n";

export const dateFnsLocales: Record<Locale, DateFnsLocale> = {
  en: enUS,
  es,
  pt,
  fr,
  de,
};

export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  es: "es-ES",
  pt: "pt-PT",
  fr: "fr-FR",
  de: "de-DE",
};

/**
 * Format a UTC calendar date (or UTC clock time) with a date-fns locale.
 * Uses UTC fields so a week stored at midnight UTC does not shift a day
 * in timezones behind UTC.
 */
export function formatUtcDate(
  date: Date,
  pattern: string,
  locale: string
): string {
  const shifted = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes()
  );
  const dfLocale = dateFnsLocales[locale as Locale] ?? enUS;
  return format(shifted, pattern, { locale: dfLocale });
}
