"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ArrowLeft, Clock } from "lucide-react";
import { useTranslation } from "@/i18n/client";
import { PublicLanguageSwitcher } from "@/components/public-language-switcher";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale: currentLocale, setLocale } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);
  const [reportDay, setReportDay] = useState(1); // Monday default
  const [reportHour, setReportHour] = useState(8); // 8 AM UTC default
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLocaleChange = (value: string) => {
    const loc = value as Locale;
    setSelectedLocale(loc);
    // Immediately switch the UI language so the user sees the form in their chosen language
    setLocale(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
      setError(t("auth.passwordRequirements"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, locale: selectedLocale, reportDay, reportHour }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("common.somethingWentWrong"));
        return;
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(t("common.tryAgain"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 relative">
      <div className="absolute top-4 right-4">
        <PublicLanguageSwitcher />
      </div>
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("auth.backToHome")}
        </Link>
        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Logo size={40} />
            </div>
            <CardTitle className="text-2xl font-bold">{t("auth.createAccount")}</CardTitle>
            <CardDescription>
              {t("auth.registerSubtitle")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("auth.fullNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.minChars")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="locale">{t("auth.preferredLanguage")}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                        {t("auth.preferredLanguageTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <Select
                  value={selectedLocale}
                  onValueChange={handleLocaleChange}
                  disabled={loading}
                >
                  <SelectTrigger id="locale">
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span>{localeFlags[selectedLocale]}</span>
                        <span>{localeNames[selectedLocale]}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        <span className="flex items-center gap-1.5">
                          <span>{localeFlags[loc]}</span>
                          <span>{localeNames[loc]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Report Schedule */}
              <div className="space-y-3">
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {t("schedule.reportSchedule")}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                          tabIndex={-1}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                        {t("schedule.scheduleTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="reportDay" className="text-xs text-muted-foreground">{t("schedule.dayOfWeek")}</Label>
                    <Select
                      value={String(reportDay)}
                      onValueChange={(v) => setReportDay(Number(v))}
                      disabled={loading}
                    >
                      <SelectTrigger id="reportDay">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {t(`schedule.days.${day}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reportHour" className="text-xs text-muted-foreground">{t("schedule.timeUTC")}</Label>
                    <Select
                      value={String(reportHour)}
                      onValueChange={(v) => setReportHour(Number(v))}
                      disabled={loading}
                    >
                      <SelectTrigger id="reportHour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {String(i).padStart(2, "0")}:00 UTC
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("schedule.cannotChangeLater")}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.creatingAccount") : t("auth.createAccountBtn")}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t("auth.hasAccount")}{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  {t("common.signIn")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
