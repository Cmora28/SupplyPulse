"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Shield,
  Users,
  Play,
  Mail,
  Loader2,
  RefreshCw,
  Factory,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/i18n/client";

const ADMIN_EMAIL = "admin@example.com";

interface ReportRunItem {
  id: string;
  status: string;
  supplier: { name: string };
}

interface ReportRun {
  id: string;
  weekOf: string;
  status: string;
  createdAt: string;
  _count: { items: number };
  items: ReportRunItem[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  emailNotifications: boolean;
  createdAt: string;
  _count: { suppliers: number };
  reportRuns: ReportRun[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
  READY: "bg-green-100 text-green-700 border-green-200",
  EMAILED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  SUCCESS: "bg-green-100 text-green-700 border-green-200",
};

const tierColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700 border-gray-200",
  STANDARD: "bg-blue-100 text-blue-700 border-blue-200",
  PREMIUM: "bg-amber-100 text-amber-700 border-amber-200",
  ENTERPRISE: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringReport, setTriggeringReport] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.failedToLoadUsers"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session, sessionStatus, router, fetchUsers]);

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleTriggerReport = async (userId: string, userName: string) => {
    setTriggeringReport(userId);
    try {
      const res = await fetch("/api/admin/reports/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error || t("admin.failedToTriggerReport"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("admin.reportTriggered"),
        description: data.message,
      });

      // Refresh after a short delay to show updated status
      setTimeout(fetchUsers, 2000);
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.failedToTriggerReport"),
        variant: "destructive",
      });
    } finally {
      setTriggeringReport(null);
    }
  };

  const handleResendEmail = async (
    reportRunId: string,
    userEmail: string
  ) => {
    setResendingEmail(reportRunId);
    try {
      const res = await fetch("/api/admin/reports/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportRunId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: t("admin.emailFailed"),
          description: data.error || t("admin.failedToSendEmail"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("admin.emailSent"),
        description: data.message,
      });

      fetchUsers();
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.failedToSendEmail"),
        variant: "destructive",
      });
    } finally {
      setResendingEmail(null);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("admin.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("admin.subtitle")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalSuppliers")}
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, u) => sum + u._count.suppliers, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalReportRuns")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.reduce((sum, u) => sum + u.reportRuns.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {users.map((user) => {
          const isExpanded = expandedUsers.has(user.id);

          return (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleUser(user.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {user.name}
                        <Badge
                          variant="outline"
                          className={tierColors[user.subscriptionTier] || ""}
                        >
                          {user.subscriptionTier}
                        </Badge>
                        {!user.emailNotifications && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                            {t("admin.emailsOff")}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {user.email} &middot;{" "}
                        {t("admin.supplierCount", { count: user._count.suppliers })} &middot;
                        {t("admin.joined", { date: format(new Date(user.createdAt), "MMM d, yyyy") })}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleTriggerReport(user.id, user.name)
                    }
                    disabled={
                      triggeringReport === user.id ||
                      user._count.suppliers === 0
                    }
                  >
                    {triggeringReport === user.id ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    {t("admin.runReport")}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  {user.reportRuns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t("admin.noReportRuns")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("admin.recentReportRuns")}
                      </p>
                      {user.reportRuns.map((run) => {
                        const canResendEmail =
                          run.status === "READY" ||
                          run.status === "FAILED";
                        const hasSuccessItems = run.items.some(
                          (i) => i.status === "SUCCESS"
                        );

                        return (
                          <div
                            key={run.id}
                            className="border rounded-lg p-3 space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {t("admin.weekOf", { date: format(new Date(run.weekOf), "MMMM d, yyyy") })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(run.createdAt),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}{" "}
                                  &middot; {t("admin.itemCount", { count: run._count.items })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    statusColors[run.status] || ""
                                  }
                                >
                                  {run.status}
                                </Badge>
                                {canResendEmail && hasSuccessItems && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleResendEmail(
                                        run.id,
                                        user.email
                                      )
                                    }
                                    disabled={resendingEmail === run.id}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  >
                                    {resendingEmail === run.id ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Mail className="mr-1 h-3 w-3" />
                                    )}
                                    {t("admin.sendEmail")}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {/* Items breakdown */}
                            <div className="flex flex-wrap gap-1.5">
                              {run.items.map((item) => (
                                <Badge
                                  key={item.id}
                                  variant="outline"
                                  className={`text-xs ${
                                    statusColors[item.status] || ""
                                  }`}
                                >
                                  {item.supplier.name}: {item.status}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {users.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("admin.noUsersFound")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
