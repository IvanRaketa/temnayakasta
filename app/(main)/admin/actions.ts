"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReportStatus,
  SecurityEventType,
  SecuritySeverity,
  UserRole,
  UserStatus,
  type Prisma,
} from "@/lib/generated/prisma/client";

const userRoles = new Set<string>(Object.values(UserRole));
const userStatuses = new Set<string>(Object.values(UserStatus));
const postStatuses = new Set<string>(Object.values(PostStatus));
const commentStatuses = new Set<string>(Object.values(CommentStatus));
const reportStatuses = new Set<string>(Object.values(ReportStatus));

async function requireAdminForAction(route = "/admin") {
  const current = await getCurrentSessionReadOnly();
  if (!current || !current.user.emailVerified || !isAdmin(current.user)) notFound();
  const context = createAuditActionContext(await headers(), route, "POST");
  return { current, context };
}

async function auditAdminAction(
  action: string,
  adminId: string,
  context: Awaited<ReturnType<typeof requireAdminForAction>>["context"],
  metadata: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: {
      userId: adminId,
      action,
      ip: context.ip,
      userAgent: context.userAgent,
      route: context.route,
      method: context.method,
      metadata,
    },
  });
}

async function countActiveAdmins(exceptUserId?: string) {
  return db.user.count({
    where: {
      id: exceptUserId ? { not: exceptUserId } : undefined,
      role: UserRole.ADMIN,
      status: { not: UserStatus.BANNED },
      deletedAt: null,
    },
  });
}

export async function updateUserRoleAdminAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!userId || !userRoles.has(role)) notFound();

  const { current, context } = await requireAdminForAction("/admin/users/role");
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, status: true, deletedAt: true },
  });
  if (!target || target.deletedAt) notFound();

  if (target.id === current.user.id && role !== UserRole.ADMIN) {
    notFound();
  }

  if (
    target.role === UserRole.ADMIN &&
    role !== UserRole.ADMIN &&
    (await countActiveAdmins(target.id)) === 0
  ) {
    notFound();
  }

  const updated = await db.user.update({
    where: { id: target.id },
    data: { role: role as UserRole },
    select: { id: true, username: true, role: true },
  });

  await auditAdminAction("ADMIN_USER_ROLE_CHANGED", current.user.id, context, {
    userId: updated.id,
    username: updated.username,
    previousRole: target.role,
    role: updated.role,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation/users");
  revalidatePath(`/profile/${updated.username}`);
}

export async function updateUserStatusAdminAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!userId || !userStatuses.has(status)) notFound();

  const { current, context } = await requireAdminForAction("/admin/users/status");
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, status: true, deletedAt: true },
  });
  if (!target || target.deletedAt) notFound();

  if (target.id === current.user.id && status !== UserStatus.ACTIVE) {
    notFound();
  }

  if (
    target.role === UserRole.ADMIN &&
    status === UserStatus.BANNED &&
    (await countActiveAdmins(target.id)) === 0
  ) {
    notFound();
  }

  const updated = await db.user.update({
    where: { id: target.id },
    data: {
      status: status as UserStatus,
      profile:
        status === UserStatus.BANNED
          ? { upsert: { create: { isHidden: true }, update: { isHidden: true } } }
          : status === UserStatus.ACTIVE
            ? { upsert: { create: { isHidden: false }, update: { isHidden: false } } }
            : undefined,
      sessions:
        status === UserStatus.BANNED
          ? {
              updateMany: {
                where: { isRevoked: false },
                data: { isRevoked: true, revokedAt: new Date() },
              },
            }
          : undefined,
    },
    select: { id: true, username: true, status: true },
  });

  if (status === UserStatus.BANNED) {
    await db.securityEvent.create({
      data: {
        userId: updated.id,
        ip: context.ip,
        userAgent: context.userAgent,
        type: SecurityEventType.ACCOUNT_BANNED,
        severity: SecuritySeverity.HIGH,
        metadata: { adminId: current.user.id },
      },
    });
  }

  await auditAdminAction("ADMIN_USER_STATUS_CHANGED", current.user.id, context, {
    userId: updated.id,
    username: updated.username,
    previousStatus: target.status,
    status: updated.status,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation/users");
  revalidatePath(`/profile/${updated.username}`);
}

export async function updateUserPremiumAdminAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const premiumDays = Number(String(formData.get("premiumDays") ?? "0"));
  const allowedDays = new Set([0, 30, 90, 365]);
  if (!userId || !allowedDays.has(premiumDays)) notFound();

  const { current, context } = await requireAdminForAction("/admin/users/premium");
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, premiumUntil: true, deletedAt: true },
  });
  if (!target || target.deletedAt) notFound();

  const premiumUntil =
    premiumDays > 0 ? new Date(Date.now() + premiumDays * 24 * 60 * 60 * 1000) : null;

  const updated = await db.user.update({
    where: { id: target.id },
    data: {
      premiumUntil,
      profile:
        premiumUntil === null
          ? {
              upsert: {
                create: { premiumNameEffect: "none" },
                update: { premiumNameEffect: "none" },
              },
            }
          : undefined,
    },
    select: { id: true, username: true, premiumUntil: true },
  });

  await auditAdminAction("ADMIN_USER_PREMIUM_CHANGED", current.user.id, context, {
    userId: updated.id,
    username: updated.username,
    previousPremiumUntil: target.premiumUntil?.toISOString() ?? null,
    premiumUntil: updated.premiumUntil?.toISOString() ?? null,
  });

  revalidatePath("/admin");
  revalidatePath(`/profile/${updated.username}`);
}

export async function updatePostStatusAdminAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!postId || !postStatuses.has(status)) notFound();

  const { current, context } = await requireAdminForAction("/admin/posts/status");
  const existing = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, title: true, status: true, publishedAt: true, authorId: true },
  });
  if (!existing) notFound();

  const updated = await db.post.update({
    where: { id: existing.id },
    data: {
      status: status as PostStatus,
      publishedAt:
        status === PostStatus.PUBLISHED
          ? (existing.publishedAt ?? new Date())
          : existing.publishedAt,
    },
    select: { id: true, slug: true, title: true, status: true },
  });

  await auditAdminAction("ADMIN_POST_STATUS_CHANGED", current.user.id, context, {
    postId: updated.id,
    slug: updated.slug,
    title: updated.title,
    previousStatus: existing.status,
    status: updated.status,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation/queue");
  revalidatePath(`/post/${updated.slug}`);
}

export async function updateCommentStatusAdminAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!commentId || !commentStatuses.has(status)) notFound();

  const { current, context } = await requireAdminForAction("/admin/comments/status");
  const existing = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, status: true, post: { select: { slug: true } } },
  });
  if (!existing) notFound();

  const updated = await db.comment.update({
    where: { id: existing.id },
    data: { status: status as CommentStatus },
    select: { id: true, status: true, post: { select: { slug: true } } },
  });

  await auditAdminAction("ADMIN_COMMENT_STATUS_CHANGED", current.user.id, context, {
    commentId: updated.id,
    previousStatus: existing.status,
    status: updated.status,
    slug: updated.post.slug,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation/queue");
  revalidatePath(`/post/${updated.post.slug}`);
}

export async function updateReportStatusAdminAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!reportId || !reportStatuses.has(status)) notFound();

  const { current, context } = await requireAdminForAction("/admin/reports/status");
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

  await auditAdminAction("ADMIN_REPORT_STATUS_CHANGED", current.user.id, context, {
    reportId: report.id,
    status: report.status,
    targetType: report.targetType,
    targetId: report.targetId,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation/reports");
  revalidatePath(`/moderation/reports/${report.id}`);
}
