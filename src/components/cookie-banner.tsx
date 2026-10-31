"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  grantCookieConsent,
  hasStoredCookieChoice,
  rejectCookieConsent,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasStoredCookieChoice()) {
      setVisible(true);
    }
    const open = () => setVisible(true);
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, open);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t shadow-lg"
      role="dialog"
      aria-label={t("legal.cookiePreferences")}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {t("legal.cookieBannerText")}{" "}
          <Link href="/cookies" className="text-primary hover:underline">
            {t("legal.cookieBannerLink")}
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => {
              rejectCookieConsent();
              setVisible(false);
            }}
          >
            {t("legal.cookieBannerReject")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => {
              grantCookieConsent();
              setVisible(false);
            }}
          >
            {t("legal.cookieBannerAccept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
