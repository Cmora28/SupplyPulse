import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-700 border-blue-200" },
  READY: { label: "Ready", className: "bg-green-100 text-green-700 border-green-200" },
  EMAILED: { label: "Emailed", className: "bg-green-100 text-green-700 border-green-200" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
  SUCCESS: { label: "Success", className: "bg-green-100 text-green-700 border-green-200" },
};

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const tier = session.user.subscriptionTier;

  // Premium users see last 12 weeks; others see last 4
  const weekLimit = tier === "PREMIUM" || tier === "ENTERPRISE" ? 12 : 4;

  const reportRuns = await prisma.reportRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: weekLimit,
    include: {
      items: {
        include: { supplier: true },
        orderBy: { supplier: { name: "asc" } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Your weekly AI-generated supply chain risk reports.
        </p>
      </div>

      {reportRuns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No reports yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Reports are generated automatically every Monday at 8:00 AM UTC.
              Make sure you have at least one supplier added to receive reports.
            </p>
            <Link href="/dashboard/suppliers" className="mt-4">
              <Button variant="outline">Manage Suppliers</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reportRuns.map((run) => {
            const status = statusConfig[run.status] || statusConfig.PENDING;
            const successCount = run.items.filter(
              (i) => i.status === "SUCCESS"
            ).length;
            const canDownload =
              run.status === "EMAILED" || run.status === "READY";

            return (
              <Card key={run.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        Week of {format(run.weekOf, "MMMM d, yyyy")}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(run.createdAt, "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                      {canDownload && (
                        <a href={`/api/reports/${run.id}/pdf`}>
                          <Button size="sm" variant="outline">
                            <Download className="mr-1 h-3 w-3" />
                            PDF
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {run.items.map((item) => {
                      const itemStatus =
                        statusConfig[item.status] || statusConfig.PENDING;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5 border-b last:border-0"
                        >
                          <span className="text-sm">{item.supplier.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${itemStatus.className}`}
                          >
                            {itemStatus.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {successCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {successCount} of {run.items.length} supplier reports generated
                      successfully
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
