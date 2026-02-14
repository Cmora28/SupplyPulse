"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { Play, Loader2 } from "lucide-react";

export function RunReportButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const handleRunReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/trigger", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error || t("reports.failedToTrigger"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("reports.reportStarted"),
        description: data.message,
      });

      // Refresh the page to show the new report run
      setTimeout(() => router.refresh(), 2000);
    } catch {
      toast({
        title: t("common.error"),
        description: t("common.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRunReport} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Play className="mr-2 h-4 w-4" />
      )}
      {loading ? t("reports.running") : t("reports.runReport")}
    </Button>
  );
}
