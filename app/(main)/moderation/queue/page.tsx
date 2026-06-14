import type { Metadata } from "next";
import Link from "next/link";

import { moderateCommentAction, moderatePostAction } from "@/app/(main)/moderation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { CommentStatus, PostStatus, ReportStatus } from "@/lib/generated/prisma/client";
import { requireModerator } from "@/lib/moderation/access";
import { getPostPath } from "@/lib/posts/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Очередь модерации" };

function PostAction({ postId, action, label }: { postId: string; action: string; label: string }) {
  return (
    <form action={moderatePostAction}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

function CommentAction({
  commentId,
  action,
  label,
}: {
  commentId: string;
  action: string;
  label: string;
}) {
  return (
    <form action={moderateCommentAction}>
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

export default async function ModerationQueuePage() {
  await requireModerator();
  const [posts, comments, reports, securityEvents] = await Promise.all([
    db.post.findMany({
      where: { status: PostStatus.PENDING_REVIEW },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { username: true } } },
    }),
    db.comment.findMany({
      where: { status: CommentStatus.PENDING_REVIEW },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { username: true } },
        post: { select: { id: true, title: true, slug: true } },
      },
    }),
    db.report.findMany({
      where: { status: ReportStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reporter: { select: { username: true } } },
    }),
    db.securityEvent.findMany({
      where: { severity: { in: ["HIGH", "CRITICAL"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Очередь модерации</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Посты на проверке</h2>
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{post.status}</Badge>
                <Link className="break-words text-primary hover:underline" href={getPostPath(post)}>
                  {post.title}
                </Link>
                <Link
                  className="text-sm text-muted-foreground hover:text-primary"
                  href={`/profile/${post.author.username}`}
                >
                  @{post.author.username}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <PostAction postId={post.id} action="approve" label="Одобрить" />
                <PostAction postId={post.id} action="hide" label="Скрыть" />
                <PostAction postId={post.id} action="block" label="Заблокировать" />
              </div>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Постов на проверке нет.</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Комментарии на проверке</h2>
        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="space-y-3 p-4">
              <p className="break-words text-sm">{comment.content}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link className="text-primary hover:underline" href={getPostPath(comment.post)}>
                  Открыть пост
                </Link>
                <Link
                  className="text-muted-foreground hover:text-primary"
                  href={`/profile/${comment.author.username}`}
                >
                  @{comment.author.username}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <CommentAction commentId={comment.id} action="approve" label="Одобрить" />
                <CommentAction commentId={comment.id} action="hide" label="Скрыть" />
                <CommentAction commentId={comment.id} action="block" label="Заблокировать" />
              </div>
            </CardContent>
          </Card>
        ))}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Комментариев на проверке нет.</p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние жалобы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/moderation/reports/${report.id}`}
                className="block break-words text-primary hover:underline"
              >
                {report.targetType} · @{report.reporter.username}
              </Link>
            ))}
            {reports.length === 0 ? (
              <p className="text-muted-foreground">Нет ожидающих жалоб.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SecurityEvent высокого уровня</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {securityEvents.map((event) => (
              <p key={event.id} className="break-words">
                {event.severity} · {event.type}
              </p>
            ))}
            {securityEvents.length === 0 ? (
              <p className="text-muted-foreground">Нет событий высокого уровня.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
