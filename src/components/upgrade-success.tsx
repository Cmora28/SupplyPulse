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
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <p className="text-sm font-medium text-green-800">
          {t("upgradeSuccess.processing")}
        </p>
      </div>
    );
  }

  return null;
}
