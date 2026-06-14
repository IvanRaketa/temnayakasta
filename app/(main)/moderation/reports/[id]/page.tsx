import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { actOnReportTargetAction, updateReportStatusAction } from "@/app/(main)/moderation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { ReportTargetType } from "@/lib/generated/prisma/client";
import { requireModerator } from "@/lib/moderation/access";
import { getReportReasonLabel } from "@/lib/moderation/report-reasons";
import { getPostPath } from "@/lib/posts/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Жалоба" };

async function getTarget(targetType: ReportTargetType, targetId: string) {
  if (targetType === ReportTargetType.POST) {
    const post = await db.post.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        author: { select: { username: true } },
      },
    });
    return post
      ? {
          title: post.title,
          status: post.status,
          href: getPostPath(post),
          author: post.author.username,
        }
      : null;
  }
  if (targetType === ReportTargetType.COMMENT) {
    const comment = await db.comment.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        content: true,
        status: true,
        author: { select: { username: true } },
        post: { select: { id: true, title: true, slug: true } },
      },
    });
    return comment
      ? {
          title: comment.content.slice(0, 120),
          status: comment.status,
          href: getPostPath(comment.post),
          author: comment.author.username,
        }
      : null;
  }
  const user = await db.user.findUnique({
    where: { id: targetId },
    select: { username: true, status: true },
  });
  return user
    ? {
        title: `@${user.username}`,
        status: user.status,
        href: `/profile/${user.username}`,
        author: user.username,
      }
    : null;
}

function ReportStatusForm({
  reportId,
  status,
  label,
}: {
  reportId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={updateReportStatusAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

function TargetActionForm({
  targetType,
  targetId,
  action,
  label,
}: {
  targetType: string;
  targetId: string;
  action: string;
  label: string;
}) {
  return (
    <form action={actOnReportTargetAction}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModerator();
  const { id } = await params;
  const report = await db.report.findUnique({
    where: { id },
    include: { reporter: { select: { username: true } } },
  });
  if (!report) notFound();

  const target = await getTarget(report.targetType, report.targetId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Жалоба <Badge>{report.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Автор жалобы:{" "}
            <Link className="text-primary" href={`/profile/${report.reporter.username}`}>
              @{report.reporter.username}
            </Link>
          </p>
          <p>Тип: {report.targetType}</p>
          <p>Причина: {getReportReasonLabel(report.reason)}</p>
          <p>
            Дата:{" "}
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(
              report.createdAt,
            )}
          </p>
          <p className="break-words text-muted-foreground">
            {report.details || "Без дополнительного комментария."}
          </p>
          {target ? (
            <p>
              Объект:{" "}
              <Link className="text-primary hover:underline" href={target.href}>
                {target.title}
              </Link>{" "}
              · {target.status}
            </p>
          ) : (
            <p className="text-destructive">Объект жалобы уже недоступен.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Действия</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ReportStatusForm reportId={report.id} status="ACCEPTED" label="Принять жалобу" />
          <ReportStatusForm reportId={report.id} status="REJECTED" label="Отклонить жалобу" />
          <ReportStatusForm reportId={report.id} status="REVIEWED" label="Пометить просмотренной" />
          {report.targetType === ReportTargetType.POST ? (
            <>
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="hide"
                label="Скрыть пост"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="block"
                label="Заблокировать пост"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="restore"
                label="Вернуть пост"
              />
            </>
          ) : null}
          {report.targetType === ReportTargetType.COMMENT ? (
            <>
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="hide"
                label="Скрыть комментарий"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="block"
                label="Заблокировать комментарий"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="restore"
                label="Вернуть комментарий"
              />
            </>
          ) : null}
          {report.targetType === ReportTargetType.USER ? (
            <>
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="limit"
                label="Ограничить пользователя"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="mute"
                label="Mute пользователя"
              />
              <TargetActionForm
                targetType={report.targetType}
                targetId={report.targetId}
                action="ban"
                label="Ban пользователя"
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
