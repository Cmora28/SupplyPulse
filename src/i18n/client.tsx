"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  type Locale,
  DEFAULT_LOCALE,
  getTranslations,
  interpolate,
  locales,
} from "./index";
import type { TranslationType } from "./translations/en";

const LOCALE_STORAGE_KEY = "supplypulse-locale";
const LOCALE_COOKIE_NAME = "locale";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale, persistToServer?: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: TranslationType;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function resolve(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = navigator.language?.substring(0, 2).toLowerCase();
  if (lang && locales.includes(lang as Locale)) return lang as Locale;
  return DEFAULT_LOCALE;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // 1. Check localStorage (user's explicit preference)
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && locales.includes(stored as Locale)) return stored as Locale;

  // 2. Check cookie
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (cookie) {
    const val = cookie.split("=")[1];
    if (locales.includes(val as Locale)) return val as Locale;
  }

  // 3. Detect from browser
  return detectBrowserLocale();
}

function persistLocale(loc: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, loc);
  document.cookie = `${LOCALE_COOKIE_NAME}=${loc};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
  document.documentElement.lang = loc;
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const { data: session } = useSession();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [translations, setTranslations] = useState<TranslationType>(
    getTranslations(initialLocale)
  );
  const [syncedFromSession, setSyncedFromSession] = useState(false);

  // Initialize locale on mount (client-side only)
  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    setTranslations(getTranslations(initial));
    persistLocale(initial);
  }, []);

  // Sync from user's stored locale when session becomes available (on login)
  useEffect(() => {
    if (session?.user?.locale && !syncedFromSession) {
      const userLocale = session.user.locale as Locale;
      if (locales.includes(userLocale)) {
        setLocaleState(userLocale);
        setTranslations(getTranslations(userLocale));
        persistLocale(userLocale);
        setSyncedFromSession(true);
      }
    }
  }, [session?.user?.locale, syncedFromSession]);

  const setLocale = useCallback(
    (newLocale: Locale, persistToServer = false) => {
      setLocaleState(newLocale);
      setTranslations(getTranslations(newLocale));
      persistLocale(newLocale);

      // Optionally save to user profile in the database
      if (persistToServer) {
        fetch("/api/user/locale", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: newLocale }),
        }).catch(() => {
          // Silently fail — local storage is the fallback
        });
      }
    },
    []
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolve(
        translations as unknown as Record<string, unknown>,
        key
      );
      return interpolate(value, params);
    },
    [translations]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
