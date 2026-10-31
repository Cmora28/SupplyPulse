"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteReportButton({ reportRunId }: { reportRunId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportRunId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: t("common.error"),
          description: data.error || t("reports.failedToDeleteReport"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("reports.reportRemoved"),
        description: t("reports.reportRemovedDesc"),
      });

      router.refresh();
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
    <Button
      size="sm"
      variant="outline"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 dark:border-red-800"
    >
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="mr-1 h-3 w-3" />
      )}
      {t("common.remove")}
    </Button>
  );
}
