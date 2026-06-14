"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { guardUserStatus } from "@/lib/auth/action-guard";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import { db } from "@/lib/db";
import { PostStatus, SecurityEventType, SecuritySeverity } from "@/lib/generated/prisma/client";
import {
  combineFilterResults,
  evaluateContentFilter,
  getContentFilterMessage,
} from "@/lib/moderation/content-filter";
import { sanitizePostHtml } from "@/lib/posts/html";
import { createLatinSlug, getPostPublicSlug } from "@/lib/posts/urls";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";
import { MAX_TAGS_PER_POST, normalizeTags } from "@/lib/tags/normalize";

const TITLE_MAX_LENGTH = 160;
const CONTENT_MAX_LENGTH = 120_000;
const POST_IMAGE_UPLOAD_DISABLED_NOTICE =
  "Загрузка изображений на сайт отключена. Загрузите фото на внешний сервис и вставьте прямую HTTPS-ссылку.";

export interface SavePostInput {
  postId?: string;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  tags?: string[];
}

export interface PostEditorActionResult {
  ok: boolean;
  message: string;
  postId?: string;
  slug?: string;
  imageUrl?: string;
}

function slugifyTitle(title: string) {
  return createLatinSlug(title);
}

async function createUniqueSlug(title: string, existingPostId?: string) {
  const base = slugifyTitle(title);

  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const slug = `${base}${suffix}`;
    const existing = await db.post.findUnique({ where: { slug } });

    if (!existing || existing.id === existingPostId) {
      return slug;
    }
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

async function createPostSecurityEvent(input: {
  userId: string;
  route: string;
  reasons: string[];
}) {
  const context = createAuditActionContext(await headers(), input.route, "POST");
  await db.securityEvent.create({
    data: {
      userId: input.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.MEDIUM,
      metadata: {
        route: input.route,
        reasons: input.reasons,
      },
    },
  });
}

export async function savePostAction(input: SavePostInput): Promise<PostEditorActionResult> {
  const title = input.title.trim();
  const rawContent = input.content;
  const content = sanitizePostHtml(rawContent);
  const tags = normalizeTags(input.tags ?? []);
  const plainText = content.replace(/<[^>]*>/g, "").trim();

  if (!title) {
    return { ok: false, message: "Добавьте заголовок." };
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, message: `Заголовок длиннее ${TITLE_MAX_LENGTH} символов.` };
  }

  if (!plainText && !content.includes("<img")) {
    return { ok: false, message: "Добавьте текст или изображение." };
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    return { ok: false, message: "Публикация слишком большая." };
  }

  if ((input.tags ?? []).length > MAX_TAGS_PER_POST * 2) {
    return { ok: false, message: `Не больше ${MAX_TAGS_PER_POST} тегов.` };
  }

  try {
    const { current, error } = await getVerifiedSessionForAction("/create", "POST");
    if (!current) return { ok: false, message: error };

    const context = createAuditActionContext(await headers(), "/create", "POST");
    const guard = await guardUserStatus(current.user, "post", context);
    if (!guard.ok) return { ok: false, message: guard.message };

    const limit = await enforceRateLimit({
      ...rateLimitRules.post,
      context,
      userId: current.user.id,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    const recentPosts = await db.post.findMany({
      where: {
        authorId: current.user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true, content: true },
    });
    const filter = combineFilterResults([
      evaluateContentFilter({
        kind: "post",
        text: `${title}\n${rawContent}\n${plainText}`,
        recentTexts: recentPosts.map(
          (post) => `${post.title}\n${post.content.replace(/<[^>]*>/g, " ")}`,
        ),
      }),
      ...tags.map((tag) => evaluateContentFilter({ kind: "tag", text: `${tag.name} ${tag.slug}` })),
    ]);

    if (filter.decision === "BLOCK") {
      await createPostSecurityEvent({
        userId: current.user.id,
        route: "/create",
        reasons: filter.reasons,
      });
      return {
        ok: false,
        message: getContentFilterMessage(filter),
      };
    }

    const requestedPublish = input.status === "PUBLISHED";
    const status =
      requestedPublish && filter.decision === "PENDING_REVIEW"
        ? PostStatus.PENDING_REVIEW
        : requestedPublish
          ? PostStatus.PUBLISHED
          : PostStatus.DRAFT;
    const publishedAt = status === PostStatus.PUBLISHED ? new Date() : null;
    const successMessage =
      status === PostStatus.PENDING_REVIEW
        ? "Публикация отправлена на модерацию."
        : status === PostStatus.PUBLISHED
          ? "Публикация готова."
          : "Черновик сохранён.";

    if (input.postId) {
      const existing = await db.post.findFirst({
        where: { id: input.postId, authorId: current.user.id },
      });

      if (!existing) {
        return { ok: false, message: "Черновик не найден." };
      }

      const slug = await createUniqueSlug(title, existing.id);
      const post = await db.$transaction(async (tx) => {
        const updatedPost = await tx.post.update({
          where: { id: existing.id },
          data: {
            title,
            content,
            slug,
            status,
            publishedAt:
              status === PostStatus.PUBLISHED ? (existing.publishedAt ?? publishedAt) : null,
          },
        });

        await tx.postTag.deleteMany({ where: { postId: updatedPost.id } });

        for (const tag of tags) {
          const savedTag = await tx.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag,
          });
          await tx.postTag.upsert({
            where: {
              postId_tagId: {
                postId: updatedPost.id,
                tagId: savedTag.id,
              },
            },
            update: {},
            create: {
              postId: updatedPost.id,
              tagId: savedTag.id,
            },
          });
        }

        return updatedPost;
      });

      return {
        ok: true,
        message: successMessage,
        postId: post.id,
        slug: getPostPublicSlug(post),
      };
    }

    const slug = await createUniqueSlug(title);
    const post = await db.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          authorId: current.user.id,
          title,
          content,
          slug,
          status,
          publishedAt,
        },
      });

      for (const tag of tags) {
        const savedTag = await tx.tag.upsert({
          where: { slug: tag.slug },
          update: {},
          create: tag,
        });
        await tx.postTag.upsert({
          where: {
            postId_tagId: {
              postId: createdPost.id,
              tagId: savedTag.id,
            },
          },
          update: {},
          create: {
            postId: createdPost.id,
            tagId: savedTag.id,
          },
        });
      }

      return createdPost;
    });

    return {
      ok: true,
      message: successMessage,
      postId: post.id,
      slug: getPostPublicSlug(post),
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return {
      ok: false,
      message: "Не удалось обратиться к базе данных. Локальный черновик сохранён в браузере.",
    };
  }
}

export async function uploadPostImageAction(_formData: FormData): Promise<PostEditorActionResult> {
  const { current, error } = await getVerifiedSessionForAction("/create/image", "POST");
  if (!current) return { ok: false, message: error };

  const context = createAuditActionContext(await headers(), "/create/image", "POST");
  const guard = await guardUserStatus(current.user, "post", context);
  if (!guard.ok) return { ok: false, message: guard.message };

  const limit = await enforceRateLimit({
    ...rateLimitRules.postImageUpload,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) return { ok: false, message: limit.message };

  return {
    ok: false,
    message: POST_IMAGE_UPLOAD_DISABLED_NOTICE,
  };
}
