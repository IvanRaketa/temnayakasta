import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/ad-slot";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, PostStatus, ReactionType } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Популярное",
  description: "Популярные публикации по простому score.",
};

function rangeDate(range?: string) {
  const now = Date.now();
  if (range === "day") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

const rangeOptions = [
  ["all", "Все время"],
  ["day", "За сутки"],
  ["week", "За неделю"],
  ["month", "За месяц"],
] as const;

const POPULAR_POST_LIMIT = 50;
const POPULAR_VISIBLE_LIMIT = 20;

export default async function PopularPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tag?: string; author?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentSessionReadOnly();
  const activeRange = params.range ?? "all";
  const since = rangeDate(activeRange);
  const posts = await db.post.findMany({
    where: {
      status: PostStatus.PUBLISHED,
      publishedAt: since ? { gte: since } : { not: null },
      author: params.author
        ? { username: params.author, deletedAt: null }
        : { deletedAt: null },
      ...(params.tag ? { tags: { some: { tag: { slug: params.tag } } } } : {}),
    },
    take: POPULAR_POST_LIMIT,
    include: {
      author: { select: { username: true, avatar: true, premiumUntil: true, profile: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, reactions: true, views: true } },
      reactions: { select: { type: true } },
    },
  });

  const ranked = posts
    .map((post) => {
      const likes = post.reactions.reduce((count, reaction) => count + (reaction.type === ReactionType.LIKE ? 1 : 0), 0);
      const score = likes * 3 + post._count.comments * 2 + post._count.views;
      return { ...post, score };
    })
    .sort((a, b) => b.score - a.score || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, POPULAR_VISIBLE_LIMIT);

  return (
    <div className="space-y-5">
      <section className="tk-glass-strong tk-panel rounded-lg p-5">
        <p className="tk-kicker">Signal rating</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Популярное</h1>
        <form action="/popular" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_1fr_1fr_auto_auto]">
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Период</span><select name="range" defaultValue={activeRange} className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm outline-none backdrop-blur transition focus:border-ring">{rangeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Тег</span><input name="tag" defaultValue={params.tag ?? ""} className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm outline-none backdrop-blur transition focus:border-ring" placeholder="poisk" /></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Автор</span><input name="author" defaultValue={params.author ?? ""} className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm outline-none backdrop-blur transition focus:border-ring" placeholder="username" /></label>
          <Button type="submit" className="self-end">Применить</Button>
          <Button asChild variant="secondary" className="self-end"><Link href="/popular">Сбросить</Link></Button>
        </form>
      </section>
      <AdSlot placement={AdPlacement.FEED_INLINE} currentUser={current?.user} />
      {ranked.length > 0 ? (
        <section className="space-y-4">
          {ranked.map((post) => (
            <article key={post.id} className="space-y-2">
              <div className="mx-auto flex w-full max-w-[44rem] items-center justify-between px-1">
                <span className="tk-pill border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Рейтинг: {post.score}
                </span>
              </div>
              <PostCard post={post} />
            </article>
          ))}
        </section>
      ) : (
        <Card><CardContent className="p-5"><p className="text-sm leading-6 text-muted-foreground">Популярных постов пока нет.</p></CardContent></Card>
      )}
    </div>
  );
}
