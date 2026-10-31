"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import { CheckCircle2 } from "lucide-react";

export function UpgradeSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;
    const upgraded = searchParams.get("upgraded");
    if (upgraded === "true") {
      setHandled(true);
      // Force session refresh to pick up new tier from DB
      update().then(() => {
        toast({
          title: t("upgradeSuccess.title"),
          description: t("upgradeSuccess.description"),
        });
        // Clean up the URL
        router.replace("/dashboard");
      });
    }
  }, [searchParams, update, toast, router, handled, t]);

  // Show a brief inline success banner while the toast fires
  if (searchParams.get("upgraded") === "true" && !handled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 mb-4 dark:border-green-800 dark:bg-green-950/40">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {t("upgradeSuccess.processing")}
        </p>
      </div>
    );
  }

  return null;
}
