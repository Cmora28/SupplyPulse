import en, { type TranslationType } from "./translations/en";
import es from "./translations/es";
import pt from "./translations/pt";
import fr from "./translations/fr";
import de from "./translations/de";

export type Locale = "en" | "es" | "pt" | "fr" | "de";

export const locales: Locale[] = ["en", "es", "pt", "fr", "de"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  pt: "🇧🇷",
  fr: "🇫🇷",
  de: "🇩🇪",
};

const translations: Record<Locale, TranslationType> = {
  en,
  es,
  pt,
  fr,
  de,
};

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Get the translations object for a given locale
 */
export function getTranslations(locale: string): TranslationType {
  if (locale in translations) {
    return translations[locale as Locale];
  }
  return translations[DEFAULT_LOCALE];
}

/**
 * Interpolate variables in a string. e.g. "Hello {name}" + { name: "John" } → "Hello John"
 */
export function interpolate(
  str: string,
  params?: Record<string, string | number>
): string {
  if (!params) return str;
  return str.replace(
    /\{(\w+)\}/g,
    (_, key) => String(params[key] ?? `{${key}}`)
  );
}

/**
 * Resolve a dot-path key from the translations object.
 * e.g. resolve(translations, "nav.overview") → "Overview"
 */
function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // return the key itself as fallback
    }
  }
  return typeof current === "string" ? current : path;
}

/**
 * Create a translator function for a given locale (useful in server components).
 *
 * Usage:
 *   const t = createTranslator("en");
 *   t("dashboard.welcomeBack", { name: "John" }) → "Welcome back, John"
 */
export function createTranslator(locale: string) {
  const trans = getTranslations(locale);
  return function t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    const value = resolve(trans as unknown as Record<string, unknown>, key);
    return interpolate(value, params);
  };
}

/**
 * Detect the preferred locale from Accept-Language header or default.
 */
export function detectLocaleFromHeader(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const lang = part.split(";")[0].trim().substring(0, 2).toLowerCase();
    if (lang in translations) return lang as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Get the best locale for a server component.
 * Priority: cookie > Accept-Language header > default ("en").
 * 
 * Usage in server components:
 *   import { getServerLocale } from "@/i18n";
 *   import { cookies, headers } from "next/headers";
 *   const locale = getServerLocale(cookies(), headers());
 */
export function getServerLocale(
  cookieStore: { get(name: string): { value: string } | undefined },
  headerStore: { get(name: string): string | null }
): Locale {
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && cookieLocale in translations) {
    return cookieLocale as Locale;
  }
  return detectLocaleFromHeader(headerStore.get("accept-language"));
}

export type { TranslationType };
