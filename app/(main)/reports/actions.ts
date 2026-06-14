"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { guardUserStatus } from "@/lib/auth/action-guard";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReportStatus,
  ReportTargetType,
  SecurityEventType,
  SecuritySeverity,
  UserStatus,
} from "@/lib/generated/prisma/client";
import { isReportReason } from "@/lib/moderation/report-reasons";
import { getPostPath } from "@/lib/posts/urls";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";

export interface ReportActionState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function parseTargetType(value: FormDataEntryValue | null) {
  if (
    value === ReportTargetType.POST ||
    value === ReportTargetType.COMMENT ||
    value === ReportTargetType.USER
  ) {
    return value;
  }
  return null;
}

async function targetExists(targetType: ReportTargetType, targetId: string, reporterId: string) {
  if (targetType === ReportTargetType.POST) {
    const post = await db.post.findFirst({
      where: { id: targetId, status: { in: [PostStatus.PUBLISHED, PostStatus.PENDING_REVIEW] } },
      select: { id: true, title: true, authorId: true, slug: true },
    });
    return post ? { ownerId: post.authorId, url: getPostPath(post) } : null;
  }

  if (targetType === ReportTargetType.COMMENT) {
    const comment = await db.comment.findFirst({
      where: {
        id: targetId,
        status: { in: [CommentStatus.PUBLISHED, CommentStatus.PENDING_REVIEW] },
      },
      select: {
        id: true,
        authorId: true,
        post: { select: { id: true, title: true, slug: true } },
      },
    });
    return comment ? { ownerId: comment.authorId, url: getPostPath(comment.post) } : null;
  }

  const user = await db.user.findFirst({
    where: { id: targetId, deletedAt: null, status: { not: UserStatus.BANNED } },
    select: { id: true, username: true },
  });
  if (!user || user.id === reporterId) return null;
  return { ownerId: user.id, url: `/profile/${user.username}` };
}

export async function createReportAction(
  _prevState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const targetType = parseTargetType(formData.get("targetType"));
  const targetId = String(formData.get("targetId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const details = String(formData.get("details") ?? "")
    .trim()
    .normalize("NFKC")
    .slice(0, 1000);
  const returnPath = String(formData.get("returnPath") ?? "").trim() || "/";
  const context = createAuditActionContext(await headers(), returnPath, "POST");

  const { current, error } = await getVerifiedSessionForAction(returnPath, "POST", {
    forbidUnverified: true,
  });
  if (!current) return { ok: false, message: error };

  const statusGuard = await guardUserStatus(current.user, "report", context);
  if (!statusGuard.ok) return { ok: false, message: statusGuard.message };

  const limit = await enforceRateLimit({
    ...rateLimitRules.report,
    userId: current.user.id,
    context,
  });
  if (!limit.ok) return { ok: false, message: limit.message };

  const fieldErrors: Record<string, string> = {};
  if (!targetType) fieldErrors.targetType = "Некорректная цель жалобы.";
  if (!targetId) fieldErrors.targetId = "Цель жалобы не найдена.";
  if (!isReportReason(reason)) fieldErrors.reason = "Выберите причину жалобы.";
  if (Object.keys(fieldErrors).length > 0 || !targetType) return { ok: false, fieldErrors };

  const target = await targetExists(targetType, targetId, current.user.id);
  if (!target) return { ok: false, message: "Объект жалобы не найден или недоступен." };

  const recentReports = await db.report.count({
    where: {
      reporterId: current.user.id,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });

  const existing = await db.report.findUnique({
    where: {
      reporterId_targetType_targetId: {
        reporterId: current.user.id,
        targetType,
        targetId,
      },
    },
  });

  const report = existing
    ? await db.report.update({
        where: { id: existing.id },
        data: {
          reason,
          details: details || null,
          status: ReportStatus.PENDING,
          reviewedAt: null,
          reviewedBy: null,
        },
      })
    : await db.report.create({
        data: {
          reporterId: current.user.id,
          targetType,
          targetId,
          reason,
          details: details || null,
        },
      });

  await db.auditLog.create({
    data: {
      userId: current.user.id,
      action: existing ? "REPORT_UPDATED" : "REPORT_CREATED",
      ip: context.ip,
      userAgent: context.userAgent,
      route: context.route,
      method: context.method,
      metadata: { reportId: report.id, targetType, targetId, reason },
    },
  });

  if (recentReports >= 5) {
    await db.securityEvent.create({
      data: {
        userId: current.user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        metadata: { action: "frequent_reports", recentReports },
      },
    });
  }

  revalidatePath(returnPath);
  return {
    ok: true,
    message: existing
      ? "Жалоба обновлена и снова отправлена на проверку."
      : "Жалоба отправлена на проверку.",
  };
}
