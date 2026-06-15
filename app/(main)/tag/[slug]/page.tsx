import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash } from "lucide-react";

import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { PostStatus, UserInterestEventType } from "@/lib/generated/prisma/client";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";

export const dynamic = "force-dynamic";

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await db.tag.findUnique({ where: { slug: decodeURIComponent(slug) } });
  return { title: tag ? `#${tag.name}` : "Тег не найден" };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const current = await getCurrentSessionReadOnly();
  const tag = await db.tag.findUnique({
    where: { slug: decodedSlug },
    include: {
      posts: {
        where: { post: { status: PostStatus.PUBLISHED } },
        orderBy: { post: { publishedAt: "desc" } },
        include: {
          post: {
            include: {
              author: {
                select: {
                  username: true,
                  avatar: true,
                  premiumUntil: true,
                  profile: { select: { displayName: true, avatar: true, premiumNameEffect: true } },
                },
              },
              tags: { include: { tag: true } },
              _count: { select: { comments: true, reactions: true, views: true } },
              reactions: { select: { type: true } },
            },
          },
        },
      },
    },
  });

  if (!tag) {
    notFound();
  }

  if (current) {
    await recordInterestEvent({
      userId: current.user.id,
      type: UserInterestEventType.TAG_CLICK,
      tagId: tag.id,
    });
  }

  const posts = tag.posts.map((item) => item.post);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-xl">
            <Hash className="size-5" />
            <span className="break-words">{tag.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground">{posts.length} опубликованных постов</p>
        </CardContent>
      </Card>

      {posts.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              По этому тегу пока нет опубликованных постов.
            </p>
            <Button asChild variant="secondary">
              <Link href="/new">Новое</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
