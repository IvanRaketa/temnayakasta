import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/ad-slot";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, PostStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новое",
  description: "Новые опубликованные посты.",
};

const PAGE_SIZE = 10;

function parsePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function dateFilter(value?: string) {
  const now = Date.now();
  if (value === "day") return new Date(now - 24 * 60 * 60 * 1000);
  if (value === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (value === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

const dateOptions = [
  ["", "Все даты"],
  ["day", "За сутки"],
  ["week", "За неделю"],
  ["month", "За месяц"],
] as const;

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string; author?: string; date?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentSessionReadOnly();
  const page = parsePage(params.page);
  const since = dateFilter(params.date);
  const where = {
    status: PostStatus.PUBLISHED,
    publishedAt: since ? { gte: since } : { not: null },
    ...(params.author ? { author: { username: params.author } } : {}),
    ...(params.tag ? { tags: { some: { tag: { slug: params.tag } } } } : {}),
  };
  const posts = await db.post.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: PAGE_SIZE + 1,
    skip: (page - 1) * PAGE_SIZE,
    include: {
      author: { select: { username: true, avatar: true, premiumUntil: true, profile: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, reactions: true, views: true } },
      reactions: { select: { type: true } },
    },
  });
  const visiblePosts = posts.slice(0, PAGE_SIZE);
  const hasMore = posts.length > PAGE_SIZE;
  const nextParams = new URLSearchParams(params as Record<string, string>);
  nextParams.set("page", String(page + 1));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <section className="tk-glass-strong tk-panel rounded-2xl p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="tk-kicker">Fresh stream</p>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Новое</h1>
          </div>
        </div>
        <form
          action="/new"
          className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_auto_auto]"
        >
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Тег</span>
            <input
              name="tag"
              defaultValue={params.tag ?? ""}
              className="h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-xs outline-none backdrop-blur transition focus:border-ring"
              placeholder="poisk"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Автор</span>
            <input
              name="author"
              defaultValue={params.author ?? ""}
              className="h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-xs outline-none backdrop-blur transition focus:border-ring"
              placeholder="username"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Дата</span>
            <select
              name="date"
              defaultValue={params.date ?? ""}
              className="h-9 w-full rounded-xl border border-input bg-background/70 px-3 text-xs outline-none backdrop-blur transition focus:border-ring"
            >
              {dateOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" className="self-end">
            Применить
          </Button>
          <Button asChild variant="secondary" size="sm" className="self-end">
            <Link href="/new">Сбросить</Link>
          </Button>
        </form>
      </section>
      <AdSlot placement={AdPlacement.FEED_INLINE} currentUser={current?.user} />
      {visiblePosts.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {hasMore ? (
            <Button asChild variant="secondary" className="w-full xl:col-span-2">
              <Link href={`/new?${nextParams.toString()}`}>Показать ещё</Link>
            </Button>
          ) : null}
        </section>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm leading-6 text-muted-foreground">По этим фильтрам постов нет.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
