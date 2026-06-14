"use server";

import { headers } from "next/headers";
import { forbidden, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { guardUserStatus } from "@/lib/auth/action-guard";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import { createAuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";
import { PostStatus, UserInterestEventType, UserStatus } from "@/lib/generated/prisma/client";
import { createNotificationOnce } from "@/lib/notifications/create";
import { isPremiumActive } from "@/lib/premium";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";

export async function toggleFollowAction(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
  const targetUsername = String(formData.get("targetUsername") ?? "").trim();
  const current = await getCurrentSessionReadOnly();

  if (!current || !targetUserId || !targetUsername || current.user.id === targetUserId) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/profile/${targetUsername}`, "POST", {
      forbidUnverified: true,
    });
    forbidden();
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, deletedAt: true, status: true },
  });

  if (!target || target.deletedAt || target.status === UserStatus.BANNED) {
    notFound();
  }

  const context = createAuditActionContext(await headers(), `/profile/${target.username}`, "POST");
  const guard = await guardUserStatus(current.user, "follow", context);
  if (!guard.ok) forbidden();

  const limit = await enforceRateLimit({
    ...rateLimitRules.follow,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) forbidden();

  const existing = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: current.user.id,
        followingId: target.id,
      },
    },
  });

  if (existing) {
    await db.$transaction([
      db.follow.delete({
        where: {
          followerId_followingId: {
            followerId: current.user.id,
            followingId: target.id,
          },
        },
      }),
      db.auditLog.create({
        data: {
          userId: current.user.id,
          action: "follow.deleted",
          ip: context.ip,
          userAgent: context.userAgent,
          route: context.route,
          method: context.method,
          metadata: {
            followingId: target.id,
            followingUsername: target.username,
          },
        },
      }),
    ]);
  } else {
    await db.$transaction(async (tx) => {
      await tx.follow.create({
        data: {
          followerId: current.user.id,
          followingId: target.id,
        },
      });

      await recordInterestEvent({
        client: tx,
        userId: current.user.id,
        type: UserInterestEventType.FOLLOW,
        authorId: target.id,
        dedupeSeconds: 0,
      });

      await createNotificationOnce(tx, {
        userId: target.id,
        actorId: current.user.id,
        type: "follow.created",
        title: "Новый подписчик",
        message: `${current.user.username} подписался на вас.`,
        targetUrl: `/profile/${current.user.username}`,
        uniqueKey: `follow:${current.user.id}:${target.id}`,
      });

      await tx.auditLog.create({
        data: {
          userId: current.user.id,
          action: "follow.created",
          ip: context.ip,
          userAgent: context.userAgent,
          route: context.route,
          method: context.method,
          metadata: {
            followingId: target.id,
            followingUsername: target.username,
          },
        },
      });
    });
  }

  revalidatePath(`/profile/${target.username}`);
  revalidatePath(`/profile/${target.username}/followers`);
  revalidatePath(`/profile/${target.username}/following`);
  revalidatePath("/feed/following");
  revalidatePath("/notifications");
}

export async function togglePinnedPostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const current = await getCurrentSessionReadOnly();

  if (!current || !postId) {
    notFound();
  }

  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction(`/profile/${current.user.username}`, "POST", {
      forbidUnverified: true,
    });
    forbidden();
  }

  if (!isPremiumActive(current.user)) {
    forbidden();
  }

  const post = await db.post.findFirst({
    where: {
      id: postId,
      authorId: current.user.id,
      status: PostStatus.PUBLISHED,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  if (!post) {
    notFound();
  }

  const context = createAuditActionContext(
    await headers(),
    `/profile/${current.user.username}`,
    "POST",
  );
  const guard = await guardUserStatus(current.user, "profile", context);
  if (!guard.ok) forbidden();

  const existingProfile = await db.profile.findUnique({
    where: { userId: current.user.id },
    select: { pinnedPostId: true },
  });
  const isPinned = existingProfile?.pinnedPostId === post.id;
  const nextPinnedPostId = isPinned ? null : post.id;

  await db.$transaction([
    db.profile.upsert({
      where: { userId: current.user.id },
      create: {
        userId: current.user.id,
        pinnedPostId: nextPinnedPostId,
      },
      update: {
        pinnedPostId: nextPinnedPostId,
      },
    }),
    db.auditLog.create({
      data: {
        userId: current.user.id,
        action: isPinned ? "profile.post_unpinned" : "profile.post_pinned",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: {
          postId: post.id,
          slug: post.slug,
          title: post.title,
        },
      },
    }),
  ]);

  revalidatePath(`/profile/${current.user.username}`);
  revalidatePath(`/post/${post.slug}`);
}
