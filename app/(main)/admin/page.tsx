import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, Megaphone, MessageSquare, Shield, StickyNote, Users } from "lucide-react";

import {
  updateCommentStatusAdminAction,
  updatePostStatusAdminAction,
  updateReportStatusAdminAction,
  updateUserPremiumAdminAction,
  updateUserRoleAdminAction,
  updateUserStatusAdminAction,
} from "@/app/(main)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReportStatus,
  UserRole,
  UserStatus,
} from "@/lib/generated/prisma/client";
import { getPostPath } from "@/lib/posts/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Рабочая админ-панель Темной Касты.",
};

const roleOptions = Object.values(UserRole);
const userStatusOptions = Object.values(UserStatus);
const postStatusOptions = Object.values(PostStatus);
const commentStatusOptions = Object.values(CommentStatus);
const reportStatusOptions = Object.values(ReportStatus);
const premiumOptions = [
  ["0", "Premium: нет"],
  ["30", "Premium: 30 дней"],
  ["90", "Premium: 90 дней"],
  ["365", "Premium: 365 дней"],
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SelectSubmit({
  name,
  value,
  options,
  hiddenName,
  hiddenValue,
  action,
  label,
}: {
  name: string;
  value: string;
  options: string[];
  hiddenName: string;
  hiddenValue: string;
  action: (formData: FormData) => Promise<void>;
  label: string;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name={hiddenName} value={hiddenValue} />
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground backdrop-blur"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}

function PremiumSubmit({ userId }: { userId: string }) {
  return (
    <form action={updateUserPremiumAdminAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="premiumDays"
        defaultValue="0"
        className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground backdrop-blur"
      >
        {premiumOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary">
        Premium
      </Button>
    </form>
  );
}

export default async function AdminPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current || !current.user.emailVerified || !isAdmin(current.user)) {
    notFound();
  }

  const [
    usersTotal,
    moderatorsTotal,
    adminsTotal,
    bannedTotal,
    pendingReportsTotal,
    pendingPostsTotal,
    pendingCommentsTotal,
    activeAdsTotal,
    users,
    posts,
    comments,
    reports,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { role: UserRole.MODERATOR, deletedAt: null } }),
    db.user.count({ where: { role: UserRole.ADMIN, deletedAt: null } }),
    db.user.count({ where: { status: UserStatus.BANNED, deletedAt: null } }),
    db.report.count({ where: { status: ReportStatus.PENDING } }),
    db.post.count({ where: { status: PostStatus.PENDING_REVIEW } }),
    db.comment.count({ where: { status: CommentStatus.PENDING_REVIEW } }),
    db.advertisement.count({ where: { isActive: true } }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ role: "desc" }, { status: "desc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        role: true,
        status: true,
        premiumUntil: true,
        createdAt: true,
      },
    }),
    db.post.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        author: { select: { username: true } },
      },
    }),
    db.comment.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        author: { select: { username: true } },
        post: { select: { id: true, slug: true, title: true } },
      },
    }),
    db.report.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 25,
      include: { reporter: { select: { username: true } } },
    }),
  ]);

  const statCards = [
    { label: "Пользователи", value: usersTotal, icon: Users },
    { label: "Модераторы", value: moderatorsTotal, icon: Shield },
    { label: "Админы", value: adminsTotal, icon: Shield },
    { label: "Баны", value: bannedTotal, icon: Shield },
    { label: "Жалобы", value: pendingReportsTotal, icon: Flag },
    { label: "Посты на проверке", value: pendingPostsTotal, icon: StickyNote },
    { label: "Комментарии на проверке", value: pendingCommentsTotal, icon: MessageSquare },
    { label: "Активная реклама", value: activeAdsTotal, icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      <div className="tk-glass-strong tk-panel flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tk-kicker">Admin citadel</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Админ-панель</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Роли, пользователи, контент, жалобы и аудит без подключения платежей.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/ads">Реклама</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/moderation">Модераторка</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/moderation/logs">Аудит</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="tk-hover-lift">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 text-primary" />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="tk-glass rounded-md p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <Link
                    className="break-words font-medium text-primary hover:underline"
                    href={`/profile/${user.username}`}
                  >
                    @{user.username}
                  </Link>
                  <p className="break-words text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>{user.role}</Badge>
                    <Badge variant="outline">{user.status}</Badge>
                    <span className="text-muted-foreground">
                      {user.emailVerified ? "email verified" : "email unverified"}
                    </span>
                    <span className="text-muted-foreground">
                      created {formatDate(user.createdAt)}
                    </span>
                    {user.premiumUntil ? (
                      <span className="text-muted-foreground">
                        premium until {formatDate(user.premiumUntil)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <SelectSubmit
                    action={updateUserRoleAdminAction}
                    hiddenName="userId"
                    hiddenValue={user.id}
                    name="role"
                    value={user.role}
                    options={roleOptions}
                    label="Роль"
                  />
                  <SelectSubmit
                    action={updateUserStatusAdminAction}
                    hiddenName="userId"
                    hiddenValue={user.id}
                    name="status"
                    value={user.status}
                    options={userStatusOptions}
                    label="Статус"
                  />
                  <PremiumSubmit userId={user.id} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Посты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="tk-glass rounded-md p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <Link
                    className="break-words font-medium text-primary hover:underline"
                    href={getPostPath(post)}
                  >
                    {post.title}
                  </Link>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>{post.status}</Badge>
                    <Link
                      className="text-muted-foreground hover:text-primary"
                      href={`/profile/${post.author.username}`}
                    >
                      @{post.author.username}
                    </Link>
                    <span className="text-muted-foreground">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
                <SelectSubmit
                  action={updatePostStatusAdminAction}
                  hiddenName="postId"
                  hiddenValue={post.id}
                  name="status"
                  value={post.status}
                  options={postStatusOptions}
                  label="Статус"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Комментарии</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="tk-glass rounded-md p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="break-words text-sm">{comment.content.slice(0, 240)}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>{comment.status}</Badge>
                    <Link
                      className="text-muted-foreground hover:text-primary"
                      href={`/profile/${comment.author.username}`}
                    >
                      @{comment.author.username}
                    </Link>
                    <Link
                      className="text-muted-foreground hover:text-primary"
                      href={getPostPath(comment.post)}
                    >
                      {comment.post.title}
                    </Link>
                    <span className="text-muted-foreground">{formatDate(comment.createdAt)}</span>
                  </div>
                </div>
                <SelectSubmit
                  action={updateCommentStatusAdminAction}
                  hiddenName="commentId"
                  hiddenValue={comment.id}
                  name="status"
                  value={comment.status}
                  options={commentStatusOptions}
                  label="Статус"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Жалобы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="tk-glass rounded-md p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/moderation/reports/${report.id}`}
                  >
                    {report.targetType} / {report.reason}
                  </Link>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>{report.status}</Badge>
                    <span className="text-muted-foreground">
                      reporter @{report.reporter.username}
                    </span>
                    <span className="text-muted-foreground">{formatDate(report.createdAt)}</span>
                  </div>
                  {report.details ? (
                    <p className="break-words text-sm text-muted-foreground">
                      {report.details.slice(0, 240)}
                    </p>
                  ) : null}
                </div>
                <SelectSubmit
                  action={updateReportStatusAdminAction}
                  hiddenName="reportId"
                  hiddenValue={report.id}
                  name="status"
                  value={report.status}
                  options={reportStatusOptions}
                  label="Статус"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
