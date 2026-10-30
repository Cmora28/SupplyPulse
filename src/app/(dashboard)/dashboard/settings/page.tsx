"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { clearSupplierOnboardingPrompt } from "@/components/first-supplier-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { User, Lock, Bell, AlertTriangle, Globe, Clock } from "lucide-react";
import { useTranslation } from "@/i18n/client";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const { t, locale, setLocale } = useTranslation();

  const [name, setName] = useState(session?.user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [p1AlertEmails, setP1AlertEmails] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [reportDay, setReportDay] = useState<number>(1);
  const [reportHour, setReportHour] = useState<number>(8);

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setName(data.name);
          setEmailNotifications(data.emailNotifications);
          setP1AlertEmails(data.p1AlertEmails ?? true);
          if (data.reportDay !== undefined) setReportDay(data.reportDay);
          if (data.reportHour !== undefined) setReportHour(data.reportHour);
        }
      } catch {
        // Ignore fetch errors
      }
    }
    fetchUser();
  }, []);

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({ title: t("settings.profileUpdated"), description: t("settings.profileUpdatedDesc") });
      updateSession();
    } catch {
      toast({
        title: t("common.error"),
        description: t("settings.failedToUpdateProfile"),
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("settings.passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("settings.passwordChanged"),
        description: t("settings.passwordChangedDesc"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({
        title: t("common.error"),
        description: t("settings.failedToChangePassword"),
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleNotifications = async (
    field: "emailNotifications" | "p1AlertEmails",
    checked: boolean
  ) => {
    if (field === "emailNotifications") setEmailNotifications(checked);
    else setP1AlertEmails(checked);
    setSavingNotifications(true);

    const revert = () => {
      if (field === "emailNotifications") setEmailNotifications(!checked);
      else setP1AlertEmails(!checked);
    };

    try {
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: checked }),
      });

      if (!res.ok) {
        revert();
        toast({
          title: t("common.error"),
          description: t("settings.failedToUpdateNotifications"),
          variant: "destructive",
        });
        return;
      }

      const description =
        field === "p1AlertEmails"
          ? checked
            ? t("settings.p1AlertsEnabledDesc")
            : t("settings.p1AlertsDisabledDesc")
          : checked
            ? t("settings.notificationsEnabledDesc")
            : t("settings.notificationsDisabledDesc");

      toast({
        title: t("settings.notificationsUpdated"),
        description,
      });
    } catch {
      revert();
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: t("settings.failedToDeleteAccount"),
          variant: "destructive",
        });
        return;
      }

      clearSupplierOnboardingPrompt(session?.user?.id);
      signOut({ callbackUrl: "/" });
    } catch {
      toast({
        title: t("common.error"),
        description: t("common.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("settings.accountInfo")}
          </CardTitle>
          <CardDescription>{t("settings.accountInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.nameLabel")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.emailLabel")}</Label>
            <Input
              id="email"
              value={session?.user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.emailCannotChange")}
            </p>
          </div>
          <Button onClick={handleSaveName} disabled={savingName}>
            {savingName ? t("settings.saving") : t("settings.saveChanges")}
          </Button>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.languageLabel")}
          </CardTitle>
          <CardDescription>{t("settings.languageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={locale}
            onValueChange={(value) => {
              setLocale(value as Locale, true);
              toast({
                title: t("settings.languageUpdated"),
                description: t("settings.languageUpdatedDesc"),
              });
            }}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue>
                <span className="flex items-center gap-1.5">
                  <span>{localeFlags[locale]}</span>
                  <span>{localeNames[locale]}</span>
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
        </CardContent>
      </Card>

      {/* Report Schedule (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("schedule.settingsTitle")}
          </CardTitle>
          <CardDescription>{t("schedule.settingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/50 border px-4 py-3">
            <p className="text-sm font-medium">
              {t("schedule.everyWeekOn", {
                day: t(`schedule.days.${reportDay}`),
                hour: `${String(reportHour).padStart(2, "0")}:00 UTC`,
              })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("schedule.cannotChangeLater")}
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("settings.changePassword")}
          </CardTitle>
          <CardDescription>
            {t("settings.changePasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("settings.minChars")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("settings.confirmNewPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {savingPassword ? t("settings.updating") : t("settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("settings.notifications")}
          </CardTitle>
          <CardDescription>
            {t("settings.notificationsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">{t("settings.emailNotifications")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.emailNotificationsDesc")}
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(checked) =>
                handleToggleNotifications("emailNotifications", checked)
              }
              disabled={savingNotifications}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <p className="font-medium text-sm">{t("settings.p1AlertEmails")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.p1AlertEmailsDesc")}
              </p>
            </div>
            <Switch
              checked={p1AlertEmails}
              onCheckedChange={(checked) =>
                handleToggleNotifications("p1AlertEmails", checked)
              }
              disabled={savingNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("settings.dangerZone")}
          </CardTitle>
          <CardDescription>
            {t("settings.dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t("settings.deleteAccount")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.deleteConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? t("settings.deleting") : t("settings.deleteMyAccount")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
