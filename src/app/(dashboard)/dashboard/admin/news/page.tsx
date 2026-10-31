"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Loader2,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { useTranslation } from "@/i18n/client";
import { ADMIN_EMAIL } from "@/lib/admin-config";

type Tab = "items" | "skipped";

interface NewsRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  supplierKeys: number;
  fetched: number;
  keywordHits: number;
  inserted: number;
  skipped: number;
  classified: number;
  unclassified: number;
  alerts: number;
  emails: number;
  purged: number;
  errors: unknown;
}

interface NewsListItem {
  id: string;
  runId: string | null;
  supplierKey: string;
  title: string;
  url: string;
  feed: string | null;
  source: string | null;
  publishedAt: string;
  fetchedAt: string;
  status: string;
  jevP: number | null;
  band: string | null;
  jevOk: boolean | null;
  jevReason: string | null;
  latencyMs: number | null;
  alertCreated: boolean;
  emailSent: boolean;
  emailStatus: string | null;
}

interface SkippedItem {
  id: string;
  runId: string | null;
  supplierKey: string;
  title: string;
  url: string;
  feed: string | null;
  source: string | null;
  publishedAt: string | null;
  skipReason: string;
  createdAt: string;
}

interface JevCallDetail {
  id: string;
  httpStatus: number | null;
  ok: boolean;
  reason: string | null;
  message: string | null;
  p: number | null;
  band: string | null;
  model: string | null;
  promptVersion: string | null;
  latencyMs: number | null;
  attempt: number;
  requestBody: unknown;
  responseRaw: unknown;
  createdAt: string;
}

interface AlertDetail {
  id: string;
  severity: string;
  summary: string;
  summarySource: string | null;
  summaryError: string | null;
  emailStatus: string | null;
  emailError: string | null;
  sentAt: string | null;
  createdAt: string;
  supplier: { id: string; name: string; country: string };
}

interface ItemDetail {
  id: string;
  title: string;
  url: string;
  supplierKey: string;
  source: string | null;
  status: string;
  jevP: number | null;
  raw: unknown;
  publishedAt: string;
  fetchedAt: string;
  jevCalls: JevCallDetail[];
  alerts: AlertDetail[];
}

const STATUSES = ["new", "unclassified", "ignored", "watch", "escalate"] as const;
const SKIP_REASONS = ["no_keyword", "cap", "bad_url", "dup_hash", "dup_title"] as const;

function errorCount(errors: unknown): number {
  return Array.isArray(errors) ? errors.length : 0;
}

function stamp(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "yyyy-MM-dd HH:mm");
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}

export default function AdminNewsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>("items");
  const [runs, setRuns] = useState<NewsRun[]>([]);
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [skipped, setSkipped] = useState<SkippedItem[]>([]);
  const [itemsCursor, setItemsCursor] = useState<string | null>(null);
  const [skippedCursor, setSkippedCursor] = useState<string | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [runId, setRunId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");
  const [sentToJev, setSentToJev] = useState("");
  const [pMin, setPMin] = useState("");
  const [pMax, setPMax] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [skipReason, setSkipReason] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const allowed = session?.user?.email === ADMIN_EMAIL;

  const filterParams = useCallback(
    (extra?: { cursor?: string | null; view?: string }) => {
      const params = new URLSearchParams();
      if (extra?.view) params.set("view", extra.view);
      if (runId) params.set("runId", runId);
      if (supplier.trim()) params.set("supplier", supplier.trim());
      if (fromDate) params.set("from", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      if (tab === "items" || extra?.view === "csv") {
        if (status) params.set("status", status);
        if (sentToJev === "yes" || sentToJev === "no") params.set("sentToJev", sentToJev);
        if (pMin !== "") params.set("pMin", pMin);
        if (pMax !== "") params.set("pMax", pMax);
      }
      if (tab === "skipped" && skipReason) params.set("skipReason", skipReason);
      if (extra?.cursor) params.set("cursor", extra.cursor);
      params.set("limit", "25");
      return params;
    },
    [runId, supplier, fromDate, toDate, tab, status, sentToJev, pMin, pMax, skipReason]
  );

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch("/api/admin/news?view=runs&limit=20");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setRuns(data.items as NewsRun[]);
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.news.failedToLoad"),
        variant: "destructive",
      });
    } finally {
      setLoadingRuns(false);
    }
  }, [toast, t]);

  const loadTable = useCallback(
    async (cursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoadingTable(true);
      try {
        const view = tab === "skipped" ? "skipped" : "items";
        const params = filterParams({ cursor, view });
        const res = await fetch(`/api/admin/news?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "failed");
        if (view === "skipped") {
          setSkippedCursor(data.nextCursor ?? null);
          setSkipped((prev) =>
            append ? [...prev, ...(data.items as SkippedItem[])] : (data.items as SkippedItem[])
          );
        } else {
          setItemsCursor(data.nextCursor ?? null);
          setItems((prev) =>
            append ? [...prev, ...(data.items as NewsListItem[])] : (data.items as NewsListItem[])
          );
        }
      } catch {
        toast({
          title: t("common.error"),
          description: t("admin.news.failedToLoad"),
          variant: "destructive",
        });
      } finally {
        setLoadingTable(false);
        setLoadingMore(false);
      }
    },
    [filterParams, tab, toast, t]
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) return;
    if (!allowed) {
      router.replace("/dashboard");
      return;
    }
    void loadRuns();
  }, [sessionStatus, session?.user, allowed, router, loadRuns]);

  useEffect(() => {
    if (!allowed) return;
    void loadTable(null, false);
    // Run chip and tab changes reload immediately. Text filters wait for Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, tab, runId]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/news/items/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setDetail(data.item as ItemDetail);
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.news.failedToLoad"),
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = filterParams({ view: "csv" });
      const res = await fetch(`/api/admin/news?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "news-audit.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: t("common.error"),
        description: t("admin.news.exportFailed"),
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (sessionStatus === "loading" || (session?.user && !allowed)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nextCursor = tab === "skipped" ? skippedCursor : itemsCursor;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/admin"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("admin.news.backToAdmin")}
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Newspaper className="h-6 w-6 text-foreground" />
            {t("admin.news.title")}
          </h1>
          <p className="text-muted-foreground">{t("admin.news.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t("admin.news.exportCsv")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadRuns();
              void loadTable(null, false);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("admin.news.refresh")}
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("admin.news.runsTitle")}</h2>
        {loadingRuns ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.news.runsEmpty")}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {runs.map((run) => {
              const selected = runId === run.id;
              const problems = errorCount(run.errors);
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setRunId(selected ? "" : run.id);
                    setTab("items");
                  }}
                  className={`min-w-[240px] rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/60 ${
                    selected ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{stamp(run.startedAt)}</span>
                    <StatusBadge status={run.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.news.counts", {
                      fetched: run.fetched,
                      hits: run.keywordHits,
                      inserted: run.inserted,
                      skipped: run.skipped,
                      classified: run.classified,
                      alerts: run.alerts,
                      emails: run.emails,
                    })}
                  </p>
                  {problems > 0 && (
                    <p className="mt-1 text-xs text-danger">
                      {t("admin.news.errors", { count: problems })}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Button
          variant={tab === "items" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("items")}
        >
          {t("admin.news.tabItems")}
        </Button>
        <Button
          variant={tab === "skipped" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("skipped")}
        >
          {t("admin.news.tabSkipped")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.news.filters")}</CardTitle>
          <CardDescription>{t("admin.news.filtersDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.news.run")}</label>
            <Select value={runId || "all"} onValueChange={(value) => setRunId(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.news.allRuns")}</SelectItem>
                {runs.map((run) => (
                  <SelectItem key={run.id} value={run.id}>
                    {stamp(run.startedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.news.supplier")}</label>
            <Input
              value={supplier}
              placeholder={t("admin.news.supplierPlaceholder")}
              onChange={(event) => setSupplier(event.target.value)}
            />
          </div>
          {tab === "items" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.news.status")}</label>
                <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.news.allStatuses")}</SelectItem>
                    {STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`admin.news.statuses.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.news.sentToJev")}</label>
                <Select
                  value={sentToJev || "all"}
                  onValueChange={(value) => setSentToJev(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.news.all")}</SelectItem>
                    <SelectItem value="yes">{t("admin.news.sentYes")}</SelectItem>
                    <SelectItem value="no">{t("admin.news.sentNo")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.news.pMin")}</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step="0.01"
                  value={pMin}
                  onChange={(event) => setPMin(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.news.pMax")}</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step="0.01"
                  value={pMax}
                  onChange={(event) => setPMax(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.news.skipReason")}</label>
              <Select
                value={skipReason || "all"}
                onValueChange={(value) => setSkipReason(value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.news.allReasons")}</SelectItem>
                  {SKIP_REASONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`admin.news.reasons.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.news.from")}</label>
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.news.to")}</label>
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void loadTable(null, false)}>
              {t("admin.news.applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loadingTable ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tab === "items" ? (
            items.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">{t("admin.news.noItems")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.news.colTitle")}</TableHead>
                    <TableHead>{t("admin.news.colSupplier")}</TableHead>
                    <TableHead>{t("admin.news.colFeed")}</TableHead>
                    <TableHead>{t("admin.news.colPublished")}</TableHead>
                    <TableHead>{t("admin.news.colFetched")}</TableHead>
                    <TableHead>{t("admin.news.colJev")}</TableHead>
                    <TableHead>{t("admin.news.colP")}</TableHead>
                    <TableHead>{t("admin.news.colBand")}</TableHead>
                    <TableHead>{t("admin.news.colLatency")}</TableHead>
                    <TableHead>{t("admin.news.colAlert")}</TableHead>
                    <TableHead>{t("admin.news.colEmail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => void openDetail(row.id)}
                    >
                      <TableCell className="max-w-[220px]">
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 text-sm font-medium text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.title}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{row.supplierKey}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[row.feed, row.source].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{stamp(row.publishedAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{stamp(row.fetchedAt)}</TableCell>
                      <TableCell>
                        {row.jevOk == null ? (
                          <span className="text-sm text-muted-foreground">{t("admin.news.sentNo")}</span>
                        ) : row.jevOk ? (
                          <StatusBadge status="ok" />
                        ) : (
                          <StatusBadge status={row.jevReason || "failed"} />
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {row.jevP == null ? "—" : row.jevP.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {row.band ? <StatusBadge status={row.band} /> : "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {row.latencyMs == null
                          ? "—"
                          : t("admin.news.latencyMs", { ms: row.latencyMs })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.alertCreated ? t("admin.news.yes") : t("admin.news.no")}
                      </TableCell>
                      <TableCell>
                        {row.emailSent ? (
                          <StatusBadge status="sent" />
                        ) : row.emailStatus ? (
                          <StatusBadge status={row.emailStatus} />
                        ) : (
                          <span className="text-sm text-muted-foreground">{t("admin.news.no")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : skipped.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("admin.news.noSkipped")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.news.colTitle")}</TableHead>
                  <TableHead>{t("admin.news.colSupplier")}</TableHead>
                  <TableHead>{t("admin.news.colFeed")}</TableHead>
                  <TableHead>{t("admin.news.colPublished")}</TableHead>
                  <TableHead>{t("admin.news.colReason")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skipped.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px]">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="line-clamp-2 text-sm font-medium text-primary hover:underline"
                      >
                        {row.title}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{row.supplierKey}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[row.feed, row.source].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{stamp(row.publishedAt)}</TableCell>
                    <TableCell className="text-sm">
                      {t(`admin.news.reasons.${row.skipReason}`)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadTable(nextCursor, true)}>
            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("admin.news.loadMore")}
          </Button>
        </div>
      )}

      <Sheet open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t("admin.news.detailTitle")}</SheetTitle>
            <SheetDescription>
              {detail ? detail.supplierKey : t("admin.news.detailHint")}
            </SheetDescription>
          </SheetHeader>
          {detailLoading || !detail ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {detail.title}
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={detail.status} />
                  <span>{detail.jevP == null ? "—" : detail.jevP.toFixed(2)}</span>
                  <span>{stamp(detail.publishedAt)}</span>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t("admin.news.rawFeed")}</h3>
                <JsonBlock value={detail.raw} />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("admin.news.jevCalls")}</h3>
                {detail.jevCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.news.noJevCalls")}</p>
                ) : (
                  detail.jevCalls.map((call) => (
                    <div key={call.id} className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={call.ok ? "ok" : call.reason || "failed"} />
                        {call.band && <StatusBadge status={call.band} />}
                        <span className="text-xs text-muted-foreground">
                          {t("admin.news.httpStatus")} {call.httpStatus ?? "—"} ·{" "}
                          {t("admin.news.attempt")} {call.attempt} ·{" "}
                          {call.latencyMs == null
                            ? "—"
                            : t("admin.news.latencyMs", { ms: call.latencyMs })}
                        </span>
                      </div>
                      {call.message && (
                        <p className="text-sm text-muted-foreground">{call.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {call.model || "—"} · {call.promptVersion || "—"} · {stamp(call.createdAt)}
                      </p>
                      <p className="text-xs font-medium">{t("admin.news.request")}</p>
                      <JsonBlock value={call.requestBody} />
                      <p className="text-xs font-medium">{t("admin.news.response")}</p>
                      <JsonBlock value={call.responseRaw} />
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("admin.news.alerts")}</h3>
                {detail.alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("admin.news.noAlerts")}</p>
                ) : (
                  detail.alerts.map((alert) => (
                    <div key={alert.id} className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {alert.supplier.name} · {alert.supplier.country}
                        </span>
                        {alert.summarySource && <StatusBadge status={alert.summarySource} />}
                        {alert.emailStatus && <StatusBadge status={alert.emailStatus} />}
                      </div>
                      <p className="text-sm">{alert.summary}</p>
                      {alert.summaryError && (
                        <p className="text-xs text-danger">
                          {t("admin.news.summaryError")}: {alert.summaryError}
                        </p>
                      )}
                      {alert.emailError && (
                        <p className="text-xs text-danger">
                          {t("admin.news.emailError")}: {alert.emailError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t("admin.news.colEmail")} {stamp(alert.sentAt)}
                      </p>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
