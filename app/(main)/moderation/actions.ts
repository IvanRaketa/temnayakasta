"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { canModerate, isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReportStatus,
  ReportTargetType,
  SecurityEventType,
  SecuritySeverity,
  UserStatus,
  type Prisma,
} from "@/lib/generated/prisma/client";

async function requireModeratorForAction(route = "/moderation") {
  const current = await getCurrentSessionReadOnly();
  if (!current || !current.user.emailVerified || !canModerate(current.user)) notFound();
  const context = createAuditActionContext(await headers(), route, "POST");
  return { current, context };
}

async function audit(
  action: string,
  moderatorId: string,
  context: Awaited<ReturnType<typeof requireModeratorForAction>>["context"],
  metadata: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: {
      userId: moderatorId,
      action,
      ip: context.ip,
      userAgent: context.userAgent,
      route: context.route,
      method: context.method,
      metadata,
    },
  });
}

export async function updateReportStatusAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!reportId || !["ACCEPTED", "REJECTED", "REVIEWED"].includes(status)) notFound();

  const { current, context } = await requireModeratorForAction(`/moderation/reports/${reportId}`);
  const existing = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!existing) notFound();

  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status: status as ReportStatus,
      reviewedBy: current.user.id,
      reviewedAt: new Date(),
    },
  });

  await audit("REPORT_REVIEWED", current.user.id, context, {
    reportId: report.id,
    status,
    targetType: report.targetType,
    targetId: report.targetId,
  });

  revalidatePath("/moderation");
  revalidatePath("/moderation/reports");
  revalidatePath(`/moderation/reports/${reportId}`);
}

export async function moderatePostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!postId || !["approve", "hide", "block", "restore"].includes(action)) notFound();

  const { current, context } = await requireModeratorForAction("/moderation");
  const existing = await db.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!existing) notFound();

  const status =
    action === "approve" || action === "restore"
      ? PostStatus.PUBLISHED
      : action === "block"
        ? PostStatus.BLOCKED
        : PostStatus.HIDDEN;

  const post = await db.post.update({
    where: { id: postId },
    data: {
      status,
      publishedAt: status === PostStatus.PUBLISHED ? new Date() : undefined,
    },
    select: { id: true, slug: true, status: true, authorId: true },
  });

  const auditAction =
    action === "block" ? "POST_BLOCKED_BY_MODERATOR" : action === "hide" ? "POST_HIDDEN_BY_MODERATOR" : "CONTENT_RESTORED";
  await audit(auditAction, current.user.id, context, { postId: post.id, slug: post.slug, status });

  revalidatePath(`/post/${post.slug}`);
  revalidatePath("/moderation/queue");
  revalidatePath("/moderation/reports");
}

export async function moderateCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!commentId || !["approve", "hide", "block", "restore"].includes(action)) notFound();

  const { current, context } = await requireModeratorForAction("/moderation");
  const existing = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!existing) notFound();

  const status =
    action === "approve" || action === "restore"
      ? CommentStatus.PUBLISHED
      : action === "block"
        ? CommentStatus.BLOCKED
        : CommentStatus.HIDDEN;

  const comment = await db.comment.update({
    where: { id: commentId },
    data: { status },
    select: { id: true, post: { select: { slug: true } } },
  });

  const auditAction =
    action === "block"
      ? "COMMENT_BLOCKED_BY_MODERATOR"
      : action === "hide"
        ? "COMMENT_HIDDEN_BY_MODERATOR"
        : "CONTENT_RESTORED";
  await audit(auditAction, current.user.id, context, { commentId: comment.id, status });

  revalidatePath(`/post/${comment.post.slug}`);
  revalidatePath("/moderation/queue");
}

export async function updateUserStatusAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!userId || !["ACTIVE", "LIMITED", "MUTED", "BANNED"].includes(status)) notFound();

  const { current, context } = await requireModeratorForAction("/moderation/users");
  if (userId === current.user.id) return;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, status: true, deletedAt: true },
  });

  if (!target || target.deletedAt) notFound();

  if (!isAdmin(current.user) && (target.role === "ADMIN" || target.role === "MODERATOR")) {
    notFound();
  }

  const user = await db.user.update({
    where: { id: userId },
    data: {
      status: status as UserStatus,
      profile: status === "BANNED" ? { upsert: { create: { isHidden: true }, update: { isHidden: true } } } : undefined,
      sessions:
        status === "BANNED"
          ? { updateMany: { where: { isRevoked: false }, data: { isRevoked: true, revokedAt: new Date() } } }
          : undefined,
    },
    select: { id: true, username: true, status: true },
  });

  if (status === "BANNED") {
    await db.securityEvent.create({
      data: {
        userId,
        ip: context.ip,
        userAgent: context.userAgent,
        type: SecurityEventType.ACCOUNT_BANNED,
        severity: SecuritySeverity.HIGH,
        metadata: { moderatorId: current.user.id },
      },
    });
  }

  const action =
    status === "BANNED"
      ? "USER_BANNED"
      : status === "MUTED"
        ? "USER_MUTED"
        : status === "LIMITED"
          ? "USER_LIMITED"
          : "USER_STATUS_CHANGED";
  await audit(action, current.user.id, context, { userId: user.id, username: user.username, status });

  revalidatePath(`/profile/${user.username}`);
  revalidatePath("/moderation/users");
}

export async function actOnReportTargetAction(formData: FormData) {
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (targetType === ReportTargetType.POST) {
    const fd = new FormData();
    fd.set("postId", targetId);
    fd.set("action", action);
    await moderatePostAction(fd);
    return;
  }

  if (targetType === ReportTargetType.COMMENT) {
    const fd = new FormData();
    fd.set("commentId", targetId);
    fd.set("action", action);
    await moderateCommentAction(fd);
    return;
  }

  if (targetType === ReportTargetType.USER) {
    if (!["ban", "mute", "limit"].includes(action)) notFound();
    const fd = new FormData();
    fd.set("userId", targetId);
    fd.set("status", action === "ban" ? "BANNED" : action === "mute" ? "MUTED" : "LIMITED");
    await updateUserStatusAction(fd);
    return;
  }

  notFound();
}
