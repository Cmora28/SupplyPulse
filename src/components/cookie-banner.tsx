"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import {
  COOKIE_CONSENT_KEY,
  grantCookieConsent,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    grantCookieConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {t("legal.cookieBannerText")}{" "}
          <Link href="/cookies" className="text-primary hover:underline">
            {t("legal.cookieBannerLink")}
          </Link>
        </p>
        <Button size="sm" onClick={handleDismiss} className="shrink-0">
          {t("legal.cookieBannerAccept")}
        </Button>
      </div>
    </div>
  );
}
