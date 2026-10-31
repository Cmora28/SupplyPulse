"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { AuditAction } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/i18n/client";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
} from "lucide-react";

type AuditFeature =
  | ""
  | "auth"
  | "suppliers"
  | "reports"
  | "settings"
  | "billing"
  | "admin"
  | "support";

interface AuditItem {
  id: string;
  action: AuditAction;
  success: boolean;
  actorUserId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";
  const changes = metadata.changes as Record<string, unknown> | undefined;
  if (changes && typeof changes === "object") {
    const keys = Object.keys(changes);
    if (keys.length > 0) {
      return keys.slice(0, 3).join(", ") + (keys.length > 3 ? "…" : "");
    }
  }
  if (metadata.supplierName) return String(metadata.supplierName);
  if (metadata.summary) return String(metadata.summary).slice(0, 80);
  if (metadata.subject) return String(metadata.subject);
  return "—";
}

export default function AdminAuditPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [feature, setFeature] = useState<AuditFeature>("");
  const [action, setAction] = useState<string>("");
  const [actorEmail, setActorEmail] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchAudit = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!session?.user?.isAdmin) return;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (feature) params.set("feature", feature);
        if (action) params.set("action", action);
        if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
        if (successFilter === "true" || successFilter === "false") {
          params.set("success", successFilter);
        }
        if (fromDate) {
          params.set("from", new Date(fromDate).toISOString());
        }
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          params.set("to", end.toISOString());
        }
        if (cursor) params.set("cursor", cursor);
        params.set("limit", "25");

        const res = await fetch(`/api/admin/audit?${params}`);
        const data = await res.json();

        if (!res.ok) {
          toast({
            title: t("common.error"),
            description: data.error || t("admin.audit.failedToLoad"),
            variant: "destructive",
          });
          return;
        }

        setNextCursor(data.nextCursor ?? null);
        setItems((prev) =>
          append ? [...prev, ...(data.items as AuditItem[])] : (data.items as AuditItem[])
        );
      } catch {
        toast({
          title: t("common.error"),
          description: t("admin.audit.failedToLoad"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      session?.user,
      feature,
      action,
      actorEmail,
      successFilter,
      fromDate,
      toDate,
      toast,
      t,
    ]
  );

  useEffect(() => {
    if (!session?.user) return;
    if (!session.user.isAdmin) {
      router.replace("/dashboard");
      return;
    }
    fetchAudit(null, false);
  }, [session?.user, session?.user?.isAdmin, router, fetchAudit]);

  const actionLabel = (a: AuditAction) =>
    t(`admin.audit.actions.${a}` as Parameters<typeof t>[0]);

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/admin"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("admin.audit.backToAdmin")}
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            {t("admin.audit.title")}
          </h1>
          <p className="text-muted-foreground">{t("admin.audit.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAudit(null, false)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">{t("admin.audit.refresh")}</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.audit.filters")}</CardTitle>
          <CardDescription>{t("admin.audit.filtersDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.audit.feature")}</label>
            <Select
              value={feature || "all"}
              onValueChange={(v) => {
                setFeature(v === "all" ? "" : (v as AuditFeature));
                setAction("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.audit.allFeatures")}</SelectItem>
                <SelectItem value="auth">{t("admin.audit.features.auth")}</SelectItem>
                <SelectItem value="suppliers">{t("admin.audit.features.suppliers")}</SelectItem>
                <SelectItem value="reports">{t("admin.audit.features.reports")}</SelectItem>
                <SelectItem value="settings">{t("admin.audit.features.settings")}</SelectItem>
                <SelectItem value="billing">{t("admin.audit.features.billing")}</SelectItem>
                <SelectItem value="admin">{t("admin.audit.features.admin")}</SelectItem>
                <SelectItem value="support">{t("admin.audit.features.support")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.audit.success")}</label>
            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.audit.all")}</SelectItem>
                <SelectItem value="true">{t("admin.audit.successOnly")}</SelectItem>
                <SelectItem value="false">{t("admin.audit.failedOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.audit.actorEmail")}</label>
            <Input
              placeholder={t("admin.audit.actorEmailPlaceholder")}
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.audit.from")}</label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.audit.to")}</label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => fetchAudit(null, false)}>
              {t("admin.audit.applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">{t("admin.audit.noEvents")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t("admin.audit.colTime")}</TableHead>
                  <TableHead>{t("admin.audit.colAction")}</TableHead>
                  <TableHead>{t("admin.audit.colActor")}</TableHead>
                  <TableHead>{t("admin.audit.colTarget")}</TableHead>
                  <TableHead>{t("admin.audit.colSummary")}</TableHead>
                  <TableHead>{t("admin.audit.colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expandedId === row.id ? null : row.id)
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {expandedId === row.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(row.createdAt), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {actionLabel(row.action)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">
                        {row.actorEmail || row.actorUserId || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.targetType
                          ? `${row.targetType}${row.targetId ? ` · ${row.targetId.slice(0, 8)}…` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {summarizeMetadata(row.metadata as Record<string, unknown> | null)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.success ? "default" : "destructive"}>
                          {row.success ? t("admin.audit.ok") : t("admin.audit.fail")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedId === row.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/40">
                          <pre className="text-xs overflow-x-auto p-2 rounded">
                            {JSON.stringify(
                              {
                                ...row,
                                metadata: row.metadata,
                                ipAddress: row.ipAddress,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => fetchAudit(nextCursor, true)}
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("admin.audit.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
