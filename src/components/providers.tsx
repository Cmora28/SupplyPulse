"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/i18n/client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={true}>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
