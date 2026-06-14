import type { Metadata } from "next";
import Link from "next/link";
import { Flag, ShieldAlert, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { CommentStatus, PostStatus, ReportStatus } from "@/lib/generated/prisma/client";
import { requireModerator } from "@/lib/moderation/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Модерация",
  description: "Очередь жалоб, проверка контента и безопасность платформы.",
};

export default async function ModerationPage() {
  await requireModerator();

  const [pendingReports, pendingPosts, pendingComments, securityEvents] = await Promise.all([
    db.report.count({ where: { status: ReportStatus.PENDING } }),
    db.post.count({ where: { status: PostStatus.PENDING_REVIEW } }),
    db.comment.count({ where: { status: CommentStatus.PENDING_REVIEW } }),
    db.securityEvent.count({ where: { severity: { in: ["HIGH", "CRITICAL"] } } }),
  ]);

  const cards = [
    { href: "/moderation/reports", label: "Жалобы", value: pendingReports, icon: Flag },
    { href: "/moderation/queue", label: "Очередь", value: pendingPosts + pendingComments, icon: ShieldAlert },
    { href: "/moderation/users", label: "Пользователи", value: securityEvents, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Модерация</h1>
        <p className="mt-2 text-sm text-muted-foreground">Жалобы, спорный контент, события безопасности и статусы пользователей.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="transition hover:border-ring">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4 text-primary" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary" href="/moderation/reports">Последние жалобы</Link>
        <Link className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary" href="/moderation/queue">Очередь проверки</Link>
        <Link className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary" href="/moderation/logs">Логи безопасности</Link>
      </div>
    </div>
  );
}
