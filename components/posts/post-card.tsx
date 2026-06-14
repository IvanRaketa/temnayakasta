import Link from "next/link";
import { CalendarDays, Eye, MessageSquare, Pin, Sparkles, ThumbsUp } from "lucide-react";

import { PremiumName } from "@/components/premium/premium-name";
import { PinPostButton } from "@/components/posts/pin-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPostExcerpt, getFirstPostImageSrc } from "@/lib/posts/html";
import { getPostPath } from "@/lib/posts/urls";
import { cn } from "@/lib/utils";

interface PostCardAuthor {
  username: string;
  avatar?: string | null;
  premiumUntil?: Date | null;
  profile?: {
    displayName?: string | null;
    avatar?: string | null;
    premiumNameEffect?: string | null;
  } | null;
}

interface PostCardProps {
  post: {
    id?: string;
    title: string;
    content: string;
    slug: string;
    publishedAt?: Date | null;
    createdAt: Date;
    status?: string;
    author: PostCardAuthor;
    _count?: {
      comments?: number;
      reactions?: number;
      views?: number;
    };
    reactions?: Array<{
      type: string;
    }>;
    tags?: Array<{
      tag: {
        name: string;
        slug: string;
      };
    }>;
  };
  showStatus?: boolean;
  recommendationReason?: string;
  featured?: boolean;
  pin?: {
    canPin: boolean;
    isPinned: boolean;
  };
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Без даты";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPostLikeCount(post: PostCardProps["post"]) {
  if (post.reactions) {
    return post.reactions.filter((reaction) => reaction.type === "LIKE").length;
  }

  return post._count?.reactions ?? 0;
}

export function PostCard({
  post,
  showStatus = false,
  recommendationReason,
  featured = false,
  pin,
}: PostCardProps) {
  const authorName = post.author.profile?.displayName || post.author.username;
  const authorAvatar = post.author.profile?.avatar || post.author.avatar;
  const excerpt = createPostExcerpt(post.content);
  const thumbnailSrc = getFirstPostImageSrc(post.content);
  const likeCount = getPostLikeCount(post);
  const postPath = getPostPath(post);

  return (
    <Card
      className={cn(
        "post-card-enter group overflow-hidden tk-hover-lift hover:border-primary/35",
        featured && "tk-pinned-post",
      )}
    >
      {featured ? (
        <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-5 py-3 text-xs font-semibold uppercase text-primary">
          <span className="inline-flex items-center gap-2">
            <Pin className="size-3.5" />
            Закреплено на вершине профиля
          </span>
          <span className="hidden text-muted-foreground sm:inline">важный пост автора</span>
        </div>
      ) : null}
      {thumbnailSrc ? (
        <Link
          href={postPath}
          aria-label={`Открыть: ${post.title}`}
          className="relative block aspect-video overflow-hidden border-b border-border bg-secondary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailSrc}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        </Link>
      ) : null}
      <CardHeader className="space-y-4">
        <div className="flex min-w-0 gap-3">
          <Link
            href={`/profile/${post.author.username}`}
            className="tk-avatar-ring grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authorAvatar}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              authorName.slice(0, 2).toUpperCase()
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {showStatus && post.status ? <Badge variant="outline">{post.status}</Badge> : null}
              {recommendationReason ? (
                <Badge variant="secondary" className="w-fit gap-1">
                  <Sparkles className="size-3" />
                  {recommendationReason}
                </Badge>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link
                className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-foreground hover:text-primary"
                href={`/profile/${post.author.username}`}
              >
                <PremiumName user={post.author}>{authorName}</PremiumName>
              </Link>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <CardTitle className="break-words text-2xl leading-tight">
          <Link href={postPath} className="transition hover:text-primary">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="break-words text-sm leading-6 text-muted-foreground">
          {excerpt || "Публикация состоит из изображений или короткого форматированного блока."}
        </p>
        {post.tags && post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(({ tag }) => (
              <Link
                key={tag.slug}
                href={`/tag/${tag.slug}`}
                className="tk-pill max-w-full transition hover:border-ring hover:text-foreground"
              >
                <span className="block max-w-40 truncate">#{tag.name}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="tk-pill">
              <ThumbsUp className="size-3.5" />
              {likeCount}
            </span>
            <span className="tk-pill">
              <MessageSquare className="size-3.5" />
              {post._count?.comments ?? 0}
            </span>
            <span className="tk-pill">
              <Eye className="size-3.5" />
              {post._count?.views ?? 0}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {pin?.canPin && post.id ? (
              <PinPostButton
                postId={post.id}
                isPinned={pin.isPinned}
                className="w-full sm:w-auto"
              />
            ) : null}
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={postPath}>Открыть</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
