import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Search } from "lucide-react";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { PostCard } from "@/components/posts/post-card";
import { SearchForm } from "@/components/search/search-form";
import { FollowButton } from "@/components/social/follow-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { PostStatus, UserStatus } from "@/lib/generated/prisma/client";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поиск",
  description: "Поиск по публикациям, авторам и тегам.",
};

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const RESULT_LIMIT = 20;

function cleanQuery(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

async function getFollowingSet(currentUserId?: string) {
  if (!currentUserId) return new Set<string>();
  const follows = await db.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });
  return new Set(follows.map((follow) => follow.followingId));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = cleanQuery(params.q ?? "");
  const current = await getCurrentSessionReadOnly();
  const followingSet = await getFollowingSet(current?.user.id);
  const tooShort = q.length > 0 && q.length < MIN_QUERY_LENGTH;
  const canSearch = q.length >= MIN_QUERY_LENGTH;
  let searchBlockedMessage: string | null = null;

  if (canSearch) {
    const context = createAuditActionContext(await headers(), "/search", "GET");
    const limit = await enforceRateLimit({
      ...rateLimitRules.search,
      context,
      userId: current?.user.id,
    });

    if (!limit.ok) {
      searchBlockedMessage = limit.message;
    }
  }

  const [posts, users, tags] =
    canSearch && !searchBlockedMessage
      ? await Promise.all([
          db.post.findMany({
            where: {
              status: PostStatus.PUBLISHED,
              author: { deletedAt: null },
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
                { author: { username: { contains: q, mode: "insensitive" }, deletedAt: null } },
                { tags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
                { tags: { some: { tag: { slug: { contains: q, mode: "insensitive" } } } } },
              ],
            },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            take: RESULT_LIMIT,
            include: {
              author: { select: { username: true, avatar: true, premiumUntil: true, profile: true } },
              tags: { include: { tag: true } },
              _count: { select: { comments: true, reactions: true, views: true } },
              reactions: { select: { type: true } },
            },
          }),
          db.user.findMany({
            where: {
              deletedAt: null,
              status: { not: UserStatus.BANNED },
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { bio: { contains: q, mode: "insensitive" } },
                { profile: { bio: { contains: q, mode: "insensitive" } } },
                { profile: { statusText: { contains: q, mode: "insensitive" } } },
              ],
            },
            take: RESULT_LIMIT,
            include: {
              profile: true,
              _count: { select: { followers: true, posts: { where: { status: PostStatus.PUBLISHED } } } },
            },
          }),
          db.tag.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            },
            take: RESULT_LIMIT,
            include: { _count: { select: { posts: true } } },
          }),
        ])
      : [[], [], []];

  const empty = canSearch && posts.length === 0 && users.length === 0 && tags.length === 0;

  return (
    <div className="space-y-5">
      <Card className="tk-glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-5" />
            Поиск
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SearchForm initialQuery={q} />
          {tooShort ? <p className="text-sm text-destructive">Введите минимум {MIN_QUERY_LENGTH} символа.</p> : null}
          {searchBlockedMessage ? <p className="text-sm text-destructive">{searchBlockedMessage}</p> : null}
          {!q ? <p className="text-sm text-muted-foreground">Ищите публикации, авторов и теги. Запрос хранится в URL.</p> : null}
        </CardContent>
      </Card>

      {empty ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm leading-6 text-muted-foreground">Ничего не найдено.</p>
          </CardContent>
        </Card>
      ) : null}

      {posts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Посты</h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      {users.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Пользователи</h2>
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/profile/${user.username}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary">@{user.username}</Link>
                    <p className="line-clamp-2 break-words text-sm text-muted-foreground">{user.profile?.bio || user.bio || "Без описания"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{user._count.followers} подписчиков · {user._count.posts} постов</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button asChild variant="secondary" className="w-full sm:w-auto"><Link href={`/profile/${user.username}`}>Профиль</Link></Button>
                    <FollowButton targetUserId={user.id} targetUsername={user.username} isAuthenticated={Boolean(current)} isVerified={Boolean(current?.user.emailVerified)} isFollowing={followingSet.has(user.id)} isSelf={current?.user.id === user.id} className="w-full sm:w-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Теги</h2>
          <div className="flex flex-wrap gap-2">{tags.map((tag) => <Link key={tag.id} href={`/tag/${tag.slug}`} className="tk-link-card max-w-full px-3 py-2 text-sm text-foreground hover:border-ring"><span className="block max-w-56 truncate">#{tag.name} · {tag._count.posts}</span></Link>)}</div>
        </section>
      ) : null}
    </div>
  );
}
