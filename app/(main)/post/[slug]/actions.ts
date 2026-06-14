"use server";

import { headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { guardUserStatus } from "@/lib/auth/action-guard";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import { createAuditActionContext } from "@/lib/audit/action-context";
import {
  COMMENT_MAX_LENGTH,
  DELETED_COMMENT_TEXT,
  sanitizeCommentContent,
} from "@/lib/comments/content";
import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReactionType,
  SecurityEventType,
  SecuritySeverity,
  UserInterestEventType,
} from "@/lib/generated/prisma/client";
import { evaluateContentFilter, getContentFilterMessage } from "@/lib/moderation/content-filter";
import { createNotificationOnce } from "@/lib/notifications/create";
import { getPostPath } from "@/lib/posts/urls";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";
import { decodeRouteParam } from "@/lib/routing/decode-route-param";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";

export interface DiscussionActionState {
  ok: boolean;
  message?: string;
}

async function getActionContext(slug: string) {
  return createAuditActionContext(await headers(), `/post/${slug}`, "POST");
}

async function findCommentablePost(slug: string, userId: string) {
  return db.post.findFirst({
    where: {
      slug,
      OR: [{ status: PostStatus.PUBLISHED }, { authorId: userId }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      authorId: true,
    },
  });
}

function parseReactionType(value: FormDataEntryValue | null) {
  if (value === ReactionType.LIKE || value === ReactionType.DISLIKE) {
    return value;
  }

  return null;
}

async function createDiscussionSecurityEvent(input: {
  userId: string;
  slug: string;
  reasons: string[];
}) {
  const context = await getActionContext(input.slug);
  await db.securityEvent.create({
    data: {
      userId: input.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      type: SecurityEventType.SPAM_ATTEMPT,
      severity: SecuritySeverity.MEDIUM,
      metadata: {
        route: context.route,
        reasons: input.reasons,
      },
    },
  });
}

export async function deletePostAction(formData: FormData) {
  const slug = decodeRouteParam(String(formData.get("slug") ?? ""));
  const current = await getCurrentSessionReadOnly();

  if (!slug || !current) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/post/${slug}`, "POST", { forbidUnverified: true });
    forbidden();
  }

  const context = await getActionContext(slug);
  const guard = await guardUserStatus(current.user, "post", context);
  if (!guard.ok) forbidden();

  const post = await db.post.findFirst({
    where: {
      slug,
      authorId: current.user.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      author: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  await db.$transaction([
    db.post.update({
      where: { id: post.id },
      data: { status: PostStatus.HIDDEN },
    }),
    db.auditLog.create({
      data: {
        userId: current.user.id,
        action: "post.hidden_by_author",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: {
          postId: post.id,
          slug: post.slug,
          previousStatus: post.status,
          title: post.title,
        },
      },
    }),
  ]);

  redirect(`/profile/${post.author.username}`);
}

export async function createCommentAction(
  _prevState: DiscussionActionState,
  formData: FormData,
): Promise<DiscussionActionState> {
  const slug = decodeRouteParam(String(formData.get("slug") ?? ""));
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const rawContent = String(formData.get("content") ?? "");
  const content = sanitizeCommentContent(rawContent);
  const { current, error } = await getVerifiedSessionForAction(`/post/${slug}`, "POST", {
    forbidUnverified: true,
  });
  if (!current) return { ok: false, message: error };

  if (!slug) {
    return { ok: false, message: "Публикация не найдена." };
  }

  if (!content) {
    return { ok: false, message: "Комментарий не может быть пустым." };
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    return { ok: false, message: `Комментарий длиннее ${COMMENT_MAX_LENGTH} символов.` };
  }

  const context = await getActionContext(slug);
  const guard = await guardUserStatus(current.user, "comment", context);
  if (!guard.ok) return { ok: false, message: guard.message };

  const limit = await enforceRateLimit({
    ...rateLimitRules.comment,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) return { ok: false, message: limit.message };

  const post = await findCommentablePost(slug, current.user.id);

  if (!post) {
    return { ok: false, message: "Публикация не найдена или закрыта для обсуждения." };
  }

  if (parentId) {
    const parent = await db.comment.findFirst({
      where: {
        id: parentId,
        postId: post.id,
        status: CommentStatus.PUBLISHED,
      },
      select: { id: true },
    });

    if (!parent) {
      return { ok: false, message: "Комментарий для ответа не найден." };
    }
  }

  const recentComments = await db.comment.findMany({
    where: {
      authorId: current.user.id,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { content: true },
  });
  const filter = evaluateContentFilter({
    kind: "comment",
    text: `${rawContent}\n${content}`,
    recentTexts: recentComments.map((comment) => comment.content),
  });

  if (filter.decision === "BLOCK") {
    await createDiscussionSecurityEvent({
      userId: current.user.id,
      slug,
      reasons: filter.reasons,
    });
    return {
      ok: false,
      message: getContentFilterMessage(filter),
    };
  }

  const commentStatus =
    filter.decision === "PENDING_REVIEW" ? CommentStatus.PENDING_REVIEW : CommentStatus.PUBLISHED;

  await db.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId: post.id,
        authorId: current.user.id,
        parentId,
        content,
        status: commentStatus,
      },
    });

    await recordInterestEvent({
      client: tx,
      userId: current.user.id,
      type: UserInterestEventType.POST_COMMENT,
      postId: post.id,
      authorId: post.authorId,
      dedupeSeconds: 0,
    });

    if (commentStatus === CommentStatus.PUBLISHED && parentId) {
      const parent = await tx.comment.findUnique({
        where: { id: parentId },
        select: {
          authorId: true,
        },
      });

      if (parent) {
        await createNotificationOnce(tx, {
          userId: parent.authorId,
          actorId: current.user.id,
          type: "comment.reply.created",
          title: "Новый ответ",
          message: `${current.user.username} ответил на ваш комментарий.`,
          targetUrl: getPostPath(post),
          uniqueKey: `comment-reply:${comment.id}`,
        });
      }
    } else if (commentStatus === CommentStatus.PUBLISHED) {
      await createNotificationOnce(tx, {
        userId: post.authorId,
        actorId: current.user.id,
        type: "post.comment.created",
        title: "Новый комментарий",
        message: `${current.user.username} прокомментировал вашу публикацию.`,
        targetUrl: getPostPath(post),
        uniqueKey: `post-comment:${comment.id}`,
      });
    }

    await tx.auditLog.create({
      data: {
        userId: current.user.id,
        action: parentId ? "comment.reply.created" : "comment.created",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: {
          postId: post.id,
          slug: post.slug,
          commentId: comment.id,
          parentId,
          status: commentStatus,
          filterReasons: filter.reasons,
        },
      },
    });
  });

  revalidatePath(`/post/${slug}`);

  if (commentStatus === CommentStatus.PENDING_REVIEW) {
    return { ok: true, message: "Комментарий отправлен на модерацию." };
  }

  return { ok: true, message: parentId ? "Ответ опубликован." : "Комментарий опубликован." };
}

export async function deleteCommentAction(formData: FormData) {
  const slug = decodeRouteParam(String(formData.get("slug") ?? ""));
  const commentId = String(formData.get("commentId") ?? "").trim();
  const current = await getCurrentSessionReadOnly();

  if (!slug || !commentId || !current) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/post/${slug}`, "POST", { forbidUnverified: true });
    forbidden();
  }

  const context = await getActionContext(slug);
  const guard = await guardUserStatus(current.user, "comment", context);
  if (!guard.ok) forbidden();

  const comment = await db.comment.findFirst({
    where: {
      id: commentId,
      authorId: current.user.id,
      post: {
        slug,
      },
    },
    select: {
      id: true,
      content: true,
      status: true,
      postId: true,
      parentId: true,
      post: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!comment) {
    notFound();
  }

  if (comment.status !== CommentStatus.HIDDEN) {
    await db.$transaction([
      db.comment.update({
        where: { id: comment.id },
        data: {
          status: CommentStatus.HIDDEN,
          content: DELETED_COMMENT_TEXT,
        },
      }),
      db.auditLog.create({
        data: {
          userId: current.user.id,
          action: "comment.hidden_by_author",
          ip: context.ip,
          userAgent: context.userAgent,
          route: context.route,
          method: context.method,
          metadata: {
            postId: comment.postId,
            slug: comment.post.slug,
            commentId: comment.id,
            parentId: comment.parentId,
            previousStatus: comment.status,
          },
        },
      }),
    ]);
  }

  revalidatePath(`/post/${slug}`);
}

export async function togglePostReactionAction(formData: FormData) {
  const slug = decodeRouteParam(String(formData.get("slug") ?? ""));
  const type = parseReactionType(formData.get("type"));
  const current = await getCurrentSessionReadOnly();

  if (!slug || !type || !current) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/post/${slug}`, "POST", { forbidUnverified: true });
    forbidden();
  }

  const context = await getActionContext(slug);
  const guard = await guardUserStatus(current.user, "reaction", context);
  if (!guard.ok) forbidden();

  const limit = await enforceRateLimit({
    ...rateLimitRules.reaction,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) forbidden();

  const post = await findCommentablePost(slug, current.user.id);

  if (!post) {
    notFound();
  }

  const existing = await db.reaction.findFirst({
    where: {
      userId: current.user.id,
      postId: post.id,
    },
    orderBy: { createdAt: "asc" },
  });

  await db.$transaction(async (tx) => {
    await tx.reaction.deleteMany({
      where: {
        userId: current.user.id,
        postId: post.id,
        id: existing ? { not: existing.id } : undefined,
      },
    });

    if (existing?.type === type) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return;
    }

    if (existing) {
      await tx.reaction.update({
        where: { id: existing.id },
        data: { type },
      });

      if (type === ReactionType.LIKE) {
        await recordInterestEvent({
          client: tx,
          userId: current.user.id,
          type: UserInterestEventType.POST_LIKE,
          postId: post.id,
          authorId: post.authorId,
        });

        await createNotificationOnce(tx, {
          userId: post.authorId,
          actorId: current.user.id,
          type: "post.like.created",
          title: "Лайк публикации",
          message: `${current.user.username} оценил вашу публикацию.`,
          targetUrl: getPostPath(post),
          uniqueKey: `post-like:${current.user.id}:${post.id}`,
        });
      } else {
        await recordInterestEvent({
          client: tx,
          userId: current.user.id,
          type: UserInterestEventType.POST_DISLIKE,
          postId: post.id,
          authorId: post.authorId,
        });
      }

      return;
    }

    await tx.reaction.create({
      data: {
        userId: current.user.id,
        postId: post.id,
        type,
      },
    });

    if (type === ReactionType.LIKE) {
      await recordInterestEvent({
        client: tx,
        userId: current.user.id,
        type: UserInterestEventType.POST_LIKE,
        postId: post.id,
        authorId: post.authorId,
      });

      await createNotificationOnce(tx, {
        userId: post.authorId,
        actorId: current.user.id,
        type: "post.like.created",
        title: "Лайк публикации",
        message: `${current.user.username} оценил вашу публикацию.`,
        targetUrl: getPostPath(post),
        uniqueKey: `post-like:${current.user.id}:${post.id}`,
      });
    }

    if (type === ReactionType.DISLIKE) {
      await recordInterestEvent({
        client: tx,
        userId: current.user.id,
        type: UserInterestEventType.POST_DISLIKE,
        postId: post.id,
        authorId: post.authorId,
      });
    }
  });

  revalidatePath(`/post/${slug}`);
}

export async function toggleCommentReactionAction(formData: FormData) {
  const slug = decodeRouteParam(String(formData.get("slug") ?? ""));
  const commentId = String(formData.get("commentId") ?? "").trim();
  const type = parseReactionType(formData.get("type"));
  const current = await getCurrentSessionReadOnly();

  if (!slug || !commentId || !type || !current) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/post/${slug}`, "POST", { forbidUnverified: true });
    forbidden();
  }

  const context = await getActionContext(slug);
  const guard = await guardUserStatus(current.user, "reaction", context);
  if (!guard.ok) forbidden();

  const limit = await enforceRateLimit({
    ...rateLimitRules.reaction,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) forbidden();

  const comment = await db.comment.findFirst({
    where: {
      id: commentId,
      post: {
        slug,
        OR: [{ status: PostStatus.PUBLISHED }, { authorId: current.user.id }],
      },
    },
    select: {
      id: true,
      postId: true,
      status: true,
      authorId: true,
      post: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!comment || comment.status !== CommentStatus.PUBLISHED) {
    notFound();
  }

  const existing = await db.reaction.findFirst({
    where: {
      userId: current.user.id,
      commentId: comment.id,
    },
    orderBy: { createdAt: "asc" },
  });

  await db.$transaction(async (tx) => {
    await tx.reaction.deleteMany({
      where: {
        userId: current.user.id,
        commentId: comment.id,
        id: existing ? { not: existing.id } : undefined,
      },
    });

    if (existing?.type === type) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return;
    }

    if (existing) {
      await tx.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      if (type === ReactionType.LIKE) {
        await createNotificationOnce(tx, {
          userId: comment.authorId,
          actorId: current.user.id,
          type: "comment.like.created",
          title: "Лайк комментария",
          message: `${current.user.username} оценил ваш комментарий.`,
          targetUrl: getPostPath(comment.post),
          uniqueKey: `comment-like:${current.user.id}:${comment.id}`,
        });
      }

      return;
    }

    await tx.reaction.create({
      data: {
        userId: current.user.id,
        commentId: comment.id,
        type,
      },
    });

    if (type === ReactionType.LIKE) {
      await createNotificationOnce(tx, {
        userId: comment.authorId,
        actorId: current.user.id,
        type: "comment.like.created",
        title: "Лайк комментария",
        message: `${current.user.username} оценил ваш комментарий.`,
        targetUrl: getPostPath(comment.post),
        uniqueKey: `comment-like:${current.user.id}:${comment.id}`,
      });
    }
  });

  revalidatePath(`/post/${slug}`);
}
