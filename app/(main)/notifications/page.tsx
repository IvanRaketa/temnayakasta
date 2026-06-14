import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck, LogIn } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(main)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { getPostPath } from "@/lib/posts/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Уведомления",
  description: "Центр уведомлений Тёмной Касты.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    "follow.created": "Подписка",
    "post.like.created": "Реакция",
    "post.comment.created": "Комментарий",
    "comment.reply.created": "Ответ",
    "comment.like.created": "Реакция",
  };

  return labels[type] ?? "Событие";
}

function getPostSlugFromTargetUrl(targetUrl: string | null) {
  if (!targetUrl?.startsWith("/post/")) return null;

  const slug = targetUrl.slice("/post/".length).split("/")[0];
  if (!slug || slug.includes("--")) return null;

  return decodeURIComponent(slug);
}

export default async function NotificationsPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Войдите, чтобы видеть уведомления о подписках, комментариях и реакциях.
          </p>
          <Button asChild>
            <Link href="/login">
              <LogIn className="size-4" />
              Войти
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const notifications = await db.notification.findMany({
    where: { userId: current.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const legacyPostSlugs = Array.from(
    new Set(
      notifications
        .map((notification) => getPostSlugFromTargetUrl(notification.targetUrl))
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );
  const legacyPostPaths =
    legacyPostSlugs.length > 0
      ? new Map(
          (
            await db.post.findMany({
              where: { slug: { in: legacyPostSlugs } },
              select: { id: true, title: true, slug: true },
            })
          ).map((post) => [post.slug, getPostPath(post)]),
        )
      : new Map<string, string>();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <Bell className="size-5" />
            Уведомления
          </h1>
          <p className="text-sm text-muted-foreground">Непрочитанных: {unreadCount}</p>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="secondary" className="w-full sm:w-auto" disabled={unreadCount === 0}>
            <CheckCheck className="size-4" />
            Отметить всё прочитанным
          </Button>
        </form>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? "bg-card" : "border-primary/60 bg-card"}
            >
              <CardContent className="p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {typeLabel(notification.type)}
                      </span>
                      {!notification.isRead ? (
                        <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Новое
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <h2 className="break-words text-sm font-semibold text-foreground">
                      {notification.title}
                    </h2>
                    <p className="break-words text-sm leading-6 text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:min-w-40">
                    {notification.targetUrl ? (
                      <Button asChild variant="secondary" className="w-full">
                        <Link
                          href={
                            legacyPostPaths.get(
                              getPostSlugFromTargetUrl(notification.targetUrl) ?? "",
                            ) ?? notification.targetUrl
                          }
                        >
                          Открыть
                        </Link>
                      </Button>
                    ) : null}
                    {!notification.isRead ? (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <Button type="submit" variant="ghost" className="w-full">
                          Прочитано
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Пока нет уведомлений. Когда появятся подписчики, комментарии и лайки, они будут здесь.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
