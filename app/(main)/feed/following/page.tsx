import type { Metadata } from "next";
import Link from "next/link";
import { Home, LogIn } from "lucide-react";

import { AdSlot } from "@/components/ads/ad-slot";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, PostStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Лента подписок",
  description: "Публикации авторов, на которых вы подписаны.",
};

const FOLLOWING_POST_LIMIT = 10;

async function getFollowingPosts(userId: string) {
  return db.post.findMany({
    where: {
      status: PostStatus.PUBLISHED,
      publishedAt: { not: null },
      author: {
        deletedAt: null,
        followers: {
          some: {
            followerId: userId,
          },
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: FOLLOWING_POST_LIMIT,
    include: {
      author: {
        select: {
          username: true,
          avatar: true,
          premiumUntil: true,
          profile: {
            select: {
              displayName: true,
              avatar: true,
              premiumNameEffect: true,
            },
          },
        },
      },
      _count: {
        select: {
          comments: true,
          reactions: true,
          views: true,
        },
      },
      reactions: {
        select: {
          type: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export default async function FollowingFeedPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Лента подписок</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Войдите, чтобы видеть публикации авторов, на которых вы подписаны.
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

  const posts = await getFollowingPosts(current.user.id);

  return (
    <div className="space-y-5">
      <section className="tk-glass-strong tk-panel rounded-lg p-5">
        <p className="tk-kicker">Inner circle</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Лента подписок</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Только опубликованные посты авторов, на которых вы подписаны.
        </p>
      </section>

      <AdSlot placement={AdPlacement.FEED_INLINE} currentUser={current.user} />

      {posts.length > 0 ? (
        <section className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Здесь пока пусто</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Подпишитесь на авторов, и их новые публикации появятся здесь. Поиск авторов будет
              добавлен позже.
            </p>
            <Button asChild variant="secondary">
              <Link href="/">
                <Home className="size-4" />
                Главная лента
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
