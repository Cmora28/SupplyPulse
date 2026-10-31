"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
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
  Search,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslation } from "@/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADMIN_EMAIL } from "@/lib/admin-config";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const SUBSCRIPTION_TIERS = [
  "FREE",
  "STANDARD",
  "PLUS",
  "PREMIUM",
  "ENTERPRISE",
] as const;

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

interface PaginationInfo {
  page: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
}

interface StatsInfo {
  totalUsers: number;
  totalSuppliers: number;
  totalReportRuns: number;
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    totalUsers: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<StatsInfo>({
    totalUsers: 0,
    totalSuppliers: 0,
    totalReportRuns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [triggeringReport, setTriggeringReport] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [tierDraft, setTierDraft] = useState<Record<string, string>>({});
  const [updatingTier, setUpdatingTier] = useState<string | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDone = useRef(false);

  const fetchUsers = useCallback(
    async (search: string, page: number, limit: number) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          search,
          page: String(page),
          limit: String(limit),
        });
        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) {
          if (res.status === 403) {
            router.push("/dashboard");
            return;
          }
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
        setStats(data.stats);
        setTierDraft((prev) => {
          const next = { ...prev };
          for (const u of data.users as AdminUser[]) {
            if (!next[u.id]) next[u.id] = u.subscriptionTier;
          }
          return next;
        });
      } catch {
        toast({
          title: t("common.error"),
          description: t("admin.failedToLoadUsers"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [router, toast, t]
  );

  // Initial load once (avoid refetch when NextAuth refreshes the session object)
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user || session.user.email !== ADMIN_EMAIL) {
      if (sessionStatus === "authenticated") {
        router.push("/dashboard");
      }
      return;
    }
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchUsers(searchQuery, currentPage, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session?.user?.email, router]);

  // Debounced search: reset to page 1 on search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(value, 1, pageSize);
    }, 400);
  };

  const handlePageSizeChange = (value: string) => {
    const limit = parseInt(value, 10);
    setPageSize(limit);
    setCurrentPage(1);
    setExpandedUsers(new Set());
    fetchUsers(searchQuery, 1, limit);
  };

  // Page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setExpandedUsers(new Set());
    fetchUsers(searchQuery, newPage, pageSize);
  };

  const handleRefresh = () => {
    fetchUsers(searchQuery, currentPage, pageSize);
  };

  const handleUpdateTier = async (userId: string) => {
    const tier = tierDraft[userId];
    if (!tier) return;

    setUpdatingTier(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionTier: tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: t("common.error"),
          description: data.error || t("admin.planUpdateFailed"),
          variant: "destructive",
        });
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, subscriptionTier: data.user.subscriptionTier }
            : u
        )
      );
      toast({
        title: t("admin.planUpdated"),
        description: data.user.email,
      });
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.planUpdateFailed"),
        variant: "destructive",
      });
    } finally {
      setUpdatingTier(null);
    }
  };

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

  const handleTriggerReport = async (userId: string) => {
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

  const handleResendEmail = async (reportRunId: string) => {
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

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate pagination range display
  const startItem = pagination.totalUsers === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.totalUsers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("admin.title")}
            </h1>
            <p className="text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/admin/audit">
              <ClipboardList className="mr-2 h-4 w-4" />
              {t("admin.openAuditLog")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.totalUsers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
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
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
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
            <div className="text-2xl font-bold">{stats.totalReportRuns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & page size */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 sm:w-48">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("admin.perPage")}
          </span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination Info */}
      {!loading && pagination.totalUsers > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {t("admin.showingResults", {
              start: startItem,
              end: endItem,
              total: pagination.totalUsers,
            })}
          </p>
          {searchQuery && (
            <p className="text-xs">
              {t("admin.searchResultsFor", { query: searchQuery })}
            </p>
          )}
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
                          <StatusBadge tier={user.subscriptionTier} />
                          {!user.emailNotifications && (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-600 border-orange-200 text-xs dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800"
                            >
                              {t("admin.emailsOff")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {user.email} &middot;{" "}
                          {t("admin.supplierCount", {
                            count: user._count.suppliers,
                          })}{" "}
                          &middot;{" "}
                          {t("admin.joined", {
                            date: format(
                              new Date(user.createdAt),
                              "MMM d, yyyy"
                            ),
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <div className="flex items-center gap-2">
                        <Select
                          value={tierDraft[user.id] ?? user.subscriptionTier}
                          onValueChange={(value) =>
                            setTierDraft((prev) => ({
                              ...prev,
                              [user.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBSCRIPTION_TIERS.map((tier) => (
                              <SelectItem key={tier} value={tier}>
                                {tier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            updatingTier === user.id ||
                            (tierDraft[user.id] ?? user.subscriptionTier) ===
                              user.subscriptionTier
                          }
                          onClick={() => handleUpdateTier(user.id)}
                        >
                          {updatingTier === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            t("admin.savePlan")
                          )}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleTriggerReport(user.id)}
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
                                    {t("admin.weekOf", {
                                      date: format(
                                        new Date(run.weekOf),
                                        "MMMM d, yyyy"
                                      ),
                                    })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(run.createdAt),
                                      "MMM d, yyyy 'at' h:mm a"
                                    )}{" "}
                                    &middot;{" "}
                                    {t("admin.itemCount", {
                                      count: run._count.items,
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={run.status} />
                                  {canResendEmail && hasSuccessItems && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleResendEmail(run.id)
                                      }
                                      disabled={resendingEmail === run.id}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/40 dark:border-blue-800"
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
                                  <span key={item.id} className="inline-flex items-center gap-1.5 text-xs">
                                    <span>{item.supplier.name}</span>
                                    <StatusBadge status={item.status} />
                                  </span>
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
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchQuery
                ? t("admin.noSearchResults")
                : t("admin.noUsersFound")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {t("admin.pageOf", {
              page: pagination.page,
              total: pagination.totalPages,
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1}
              title={t("admin.firstPage")}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              title={t("admin.previousPage")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {generatePageNumbers(pagination.page, pagination.totalPages).map(
              (pageNum, idx) =>
                pageNum === null ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={
                      pageNum === pagination.page ? "default" : "outline"
                    }
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              title={t("admin.nextPage")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              title={t("admin.lastPage")}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate page number buttons with ellipsis for large page counts.
 * Shows: first, ..., current-1, current, current+1, ..., last
 */
function generatePageNumbers(
  current: number,
  total: number
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push(null); // ellipsis
  }

  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null); // ellipsis
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
