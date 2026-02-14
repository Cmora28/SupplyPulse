"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/client";

function ResetPasswordRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const token = searchParams.get("token");

  useEffect(() => {
    // Backwards compatibility: if token is in query param, redirect to path-based URL
    if (token) {
      router.replace(`/reset-password/${token}`);
    }
  }, [token, router]);

  if (token) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("auth.redirecting")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">{t("auth.invalidLink")}</CardTitle>
        <CardDescription>
          {t("auth.invalidLinkDesc")}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href="/forgot-password" className="w-full">
          <Button variant="outline" className="w-full">
            {t("auth.requestNewLink")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("common.loading")}
            </CardContent>
          </Card>
        }
      >
        <ResetPasswordRedirect />
      </Suspense>
    </div>
  );
}
