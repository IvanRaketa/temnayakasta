import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getReportReasonLabel } from "@/lib/moderation/report-reasons";
import { requireModerator } from "@/lib/moderation/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Жалобы" };

export default async function ReportsPage() {
  await requireModerator();
  const reports = await db.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: { reporter: { select: { username: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Жалобы</h1>
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Badge>{report.status}</Badge>
              {report.targetType} · {getReportReasonLabel(report.reason)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Автор жалобы: @{report.reporter.username}</p>
            <p className="break-words">{report.details || "Без дополнительного комментария."}</p>
            <Link href={`/moderation/reports/${report.id}`} className="text-primary hover:underline">
              Открыть жалобу
            </Link>
          </CardContent>
        </Card>
      ))}
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">Жалоб пока нет.</p> : null}
    </div>
  );
}
