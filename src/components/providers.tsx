"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/i18n/client";
import type { Locale } from "@/i18n";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={true}>
      <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
    </SessionProvider>
  );
}
