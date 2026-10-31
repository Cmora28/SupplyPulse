"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "@/i18n/client";
import { dateFnsLocales, intlLocales } from "@/lib/date-locale";

function timezoneLabel(date: Date, intlLocale: string): string {
  try {
    const named = new Intl.DateTimeFormat(intlLocale, {
      timeZoneName: "shortGeneric",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    if (named) return named;
  } catch {
    // shortGeneric is not implemented in every runtime.
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
}

export function LocalDateTime({
  iso,
  preset,
}: {
  iso: string;
  preset: "dateTime" | "nextReport";
}) {
  const { locale, t } = useTranslation();
  const [text, setText] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    const when = format(date, preset === "nextReport" ? "PPPP, p" : "PPp", {
      locale: dateFnsLocales[locale],
    });
    if (preset === "dateTime") {
      setText(when);
      return;
    }
    setText(
      t("dashboard.nextReportAt", {
        when,
        timezone: timezoneLabel(date, intlLocales[locale]),
      })
    );
  }, [iso, preset, locale, t]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text || "\u00a0"}
    </time>
  );
}
