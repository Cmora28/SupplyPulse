"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden />
        <h2 className="text-2xl font-bold mb-2">{t("errorPage.title")}</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t("errorPage.description")}
        </p>
        <Button onClick={reset}>{t("errorPage.tryAgain")}</Button>
      </div>
    </div>
  );
}
