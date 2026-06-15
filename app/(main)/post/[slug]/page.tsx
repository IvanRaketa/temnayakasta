import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { CalendarDays, Eye, FilePenLine, Home, MoreHorizontal, Trash2 } from "lucide-react";

import { deletePostAction } from "@/app/(main)/post/[slug]/actions";
import { AdSlot } from "@/components/ads/ad-slot";
import { CommentList } from "@/components/comments/comment-list";
import type { CommentViewModel, DiscussionUser, PostReactionSummary, ReactionTypeValue } from "@/components/comments/comment-types";
import { PostReactions } from "@/components/comments/post-reactions";
import { BackButton } from "@/components/navigation/back-button";
import { PostInterestTracker } from "@/components/posts/post-interest-tracker";
import { PinPostButton } from "@/components/posts/pin-post-button";
import { SharePostButton } from "@/components/posts/share-post-button";
import { PostPresenceCounter } from "@/components/presence/page-presence";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { PremiumName } from "@/components/premium/premium-name";
import { ReportForm } from "@/components/reports/report-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { canModerate } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { AdPlacement, CommentStatus, type ReactionType, PostStatus } from "@/lib/generated/prisma/client";
import { createPostExcerpt, sanitizePostHtml } from "@/lib/posts/html";
import { getPostEditPath, getPostIdFromPublicSlug, getPostPath, getPostPublicSlug } from "@/lib/posts/urls";
import { recordPostView } from "@/lib/posts/views";
import { decodeRouteParam } from "@/lib/routing/decode-route-param";
import { getPostStatusLabel } from "@/lib/ui/status-labels";

export const dynamic = "force-dynamic";

interface PostPageProps { params: Promise<{ slug: string }>; }

type CurrentSessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentSessionReadOnly>>>["user"];

const getPost = cache(async function getPost(slug: string) {
  const id = getPostIdFromPublicSlug(slug);
  return db.post.findUnique({
    where: id ? { id } : { slug },
    include: {
      author: { select: { id: true, username: true, avatar: true, premiumUntil: true, deletedAt: true, profile: { select: { displayName: true, avatar: true, bio: true, premiumNameEffect: true, pinnedPostId: true } } } },
      reactions: { select: { userId: true, type: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, reactions: true, views: true } },
    },
  });
});

async function getComments(postId: string, viewerId?: string, viewerCanModerate = false) {
  return db.comment.findMany({
    where: viewerCanModerate ? { postId } : { postId, OR: viewerId ? [{ status: CommentStatus.PUBLISHED }, { authorId: viewerId, status: { in: [CommentStatus.PENDING_REVIEW, CommentStatus.HIDDEN, CommentStatus.BLOCKED] } }] : [{ status: CommentStatus.PUBLISHED }] },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, avatar: true, premiumUntil: true, deletedAt: true, profile: { select: { displayName: true, avatar: true, premiumNameEffect: true } } } },
      reactions: { select: { userId: true, type: true } },
    },
  });
}

function canViewPost(post: Awaited<ReturnType<typeof getPost>>, viewerId?: string) {
  if (!post) return false;
  const isAuthor = post.authorId === viewerId;
  if (post.author.deletedAt && !isAuthor) return false;
  if (post.status === PostStatus.PUBLISHED) return true;
  if (isAuthor) return true;
  return false;
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "Не опубликовано";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function getAuthorName(post: NonNullable<Awaited<ReturnType<typeof getPost>>>) {
  if (post.author.deletedAt) return "Удалённый пользователь";
  return post.author.profile?.displayName || post.author.username;
}

function createReactionSummary(reactions: Array<{ userId: string; type: ReactionType }>, viewerId?: string): PostReactionSummary {
  return reactions.reduce<PostReactionSummary>((summary, reaction) => {
    summary.counts[reaction.type] += 1;
    if (reaction.userId === viewerId) summary.viewerReaction = reaction.type;
    return summary;
  }, { counts: { LIKE: 0, DISLIKE: 0 }, viewerReaction: null });
}

function toDiscussionUser(user: CurrentSessionUser): DiscussionUser {
  return { id: user.id, username: user.username, emailVerified: user.emailVerified, avatar: user.avatar, premiumUntil: user.premiumUntil?.toISOString() ?? null, profile: user.profile ? { displayName: user.profile.displayName, avatar: user.profile.avatar, premiumNameEffect: user.profile.premiumNameEffect } : null };
}

function buildCommentTree(comments: Awaited<ReturnType<typeof getComments>>, viewerId?: string): CommentViewModel[] {
  const byId = new Map<string, CommentViewModel>();
  const roots: CommentViewModel[] = [];
  for (const comment of comments) {
    const reactionSummary = createReactionSummary(comment.reactions, viewerId);
    byId.set(comment.id, { id: comment.id, parentId: comment.parentId, content: comment.content, status: comment.status, createdAt: comment.createdAt.toISOString(), author: { id: comment.author.id, username: comment.author.username, avatar: comment.author.avatar, premiumUntil: comment.author.premiumUntil?.toISOString() ?? null, deletedAt: comment.author.deletedAt?.toISOString() ?? null, profile: comment.author.profile ? { displayName: comment.author.profile.displayName, avatar: comment.author.profile.avatar, premiumNameEffect: comment.author.profile.premiumNameEffect } : null }, reactionCounts: reactionSummary.counts as Record<ReactionTypeValue, number>, viewerReaction: reactionSummary.viewerReaction, replies: [] });
  }
  for (const comment of byId.values()) {
    if (comment.parentId) {
      const parent = byId.get(comment.parentId);
      if (parent) { parent.replies.push(comment); continue; }
    }
    roots.push(comment);
  }
  return roots;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteParam(rawSlug);
  let post: Awaited<ReturnType<typeof getPost>>;
  try { post = await getPost(slug); } catch (error) { console.error(error); return { title: "Публикация недоступна" }; }
  if (!post || post.status !== PostStatus.PUBLISHED || post.author.deletedAt) return { title: "Публикация не найдена" };
  const description = createPostExcerpt(post.content, 160) || "Публикация на Тёмной Касте.";
  const postPath = getPostPath(post);
  return { title: post.title, description, alternates: { canonical: postPath }, openGraph: { title: post.title, description, type: "article", url: postPath, siteName: "Тёмная Каста" } };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteParam(rawSlug);
  const current = await getCurrentSessionReadOnly();
  let post: Awaited<ReturnType<typeof getPost>>;
  try { post = await getPost(slug); } catch (error) { console.error(error); notFound(); }
  if (!post || !canViewPost(post, current?.user.id)) notFound();
  const publicSlug = getPostPublicSlug(post);
  if (slug !== publicSlug) redirect(`/post/${publicSlug}`);
  const isAuthor = post.authorId === current?.user.id;
  const authorName = getAuthorName(post);
  const authorAvatar = post.author.profile?.avatar || post.author.avatar;
  const authorPremiumActive = Boolean(post.author.premiumUntil && post.author.premiumUntil > new Date());
  await recordPostView({ postId: post.id, authorId: post.authorId, viewerId: current?.user.id, headers: await headers() });
  const [viewCount, comments] = await Promise.all([db.postView.count({ where: { postId: post.id } }), getComments(post.id, current?.user.id, canModerate(current?.user))]);
  const commentTree = buildCommentTree(comments, current?.user.id);
  const currentUser = current ? toDiscussionUser(current.user) : null;
  const postReactions = createReactionSummary(post.reactions, current?.user.id);
  const postPath = getPostPath(post);

  return (
    <PresenceProvider scope="post" targetId={post.id} initialActivity="reading_post">
      <article className="space-y-5">
        <PostInterestTracker postId={post.id} enabled={Boolean(current) && !isAuthor} />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <BackButton />
            <Button asChild variant="secondary">
              <Link href="/">
                <Home className="size-4" />
                На главную
              </Link>
            </Button>
          </div>
          {isAuthor ? (
            <details className="group relative z-40 self-start sm:self-auto">
              <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-2xl border border-border/80 bg-card/80 text-muted-foreground shadow-lg shadow-black/20 backdrop-blur transition hover:border-accent/50 hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="size-5" />
                <span className="sr-only">Действия с постом</span>
              </summary>
              <div className="tk-glass-strong absolute left-0 z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-2xl p-2 shadow-2xl shadow-black/40 sm:left-auto sm:right-0">
                <div className="px-3 pb-2 pt-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Пост</p>
                  <p className="mt-0.5 truncate text-xs text-foreground/80">Действия автора</p>
                </div>
                <div className="space-y-1">
                  <Button asChild variant="ghost" className="h-10 w-full justify-start rounded-xl px-3 text-foreground hover:border-accent/35 hover:bg-secondary/80">
                    <Link href={getPostEditPath(post)}>
                      <FilePenLine className="size-4 text-primary" />
                      Редактировать
                    </Link>
                  </Button>
                  {authorPremiumActive && post.status === PostStatus.PUBLISHED ? (
                    <PinPostButton
                      postId={post.id}
                      isPinned={post.author.profile?.pinnedPostId === post.id}
                      className="w-full"
                      buttonClassName="h-10 w-full justify-start rounded-xl border-transparent bg-transparent px-3 text-foreground shadow-none hover:border-accent/35 hover:bg-secondary/80 hover:text-foreground"
                    />
                  ) : null}
                  <div className="my-1 h-px bg-border/70" />
                  <form action={deletePostAction}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <Button type="submit" variant="ghost" className="h-10 w-full justify-start rounded-xl px-3 text-destructive hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4" />
                      Удалить
                    </Button>
                  </form>
                </div>
              </div>
            </details>
          ) : null}
        </div>
        <Card className="overflow-hidden p-5 md:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {isAuthor ? <Badge variant="outline">{getPostStatusLabel(post.status)}</Badge> : null}
              {authorPremiumActive && post.author.profile?.pinnedPostId === post.id ? <Badge variant="secondary">Закреплено</Badge> : null}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(post.publishedAt ?? post.createdAt)}</span>
            </div>
            <h1 className="break-words text-3xl font-semibold leading-tight text-foreground md:text-5xl">{post.title}</h1>
            <div className="flex min-w-0 items-center gap-3 border-y border-border py-4">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{authorAvatar ? <img src={authorAvatar} alt="" className="size-full object-cover" decoding="async" /> : authorName.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0">
                {post.author.deletedAt ? <p className="truncate text-sm font-medium text-foreground">{authorName}</p> : <Link href={`/profile/${post.author.username}`} className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"><PremiumName user={post.author} className="truncate">{authorName}</PremiumName></Link>}
                <p className="text-xs text-muted-foreground">{post._count.reactions} реакций · {post._count.comments} комментариев</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Eye className="size-3.5" />{viewCount} просмотров</p>
                <div className="mt-2"><PostPresenceCounter /></div>
              </div>
            </div>
            <div className="prose-tk max-w-none break-words" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }} />
            {post.tags.length > 0 ? <div className="flex flex-wrap gap-2 border-t border-border pt-4">{post.tags.map(({ tag }) => <Link key={tag.slug} href={`/tag/${tag.slug}`} className="max-w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:border-ring hover:text-foreground"><span className="block max-w-48 truncate">#{tag.name}</span></Link>)}</div> : null}
            <div className="border-t border-border pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"><PostReactions slug={post.slug} reactions={postReactions} isAuthenticated={Boolean(current)} isVerified={Boolean(current?.user.emailVerified)} /><SharePostButton title={post.title} url={postPath} /></div><ReportForm targetType="POST" targetId={post.id} returnPath={postPath} disabled={!current?.user.emailVerified || isAuthor} className="sm:max-w-sm" /></div></div>
          </div>
        </Card>
        <AdSlot placement={AdPlacement.POST_BOTTOM} currentUser={current?.user} />
        <CommentList slug={post.slug} postPath={postPath} comments={commentTree} currentUser={currentUser} />
      </article>
    </PresenceProvider>
  );
}
