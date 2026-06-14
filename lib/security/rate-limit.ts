import type { AuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";
import { SecurityEventType, SecuritySeverity } from "@/lib/generated/prisma/client";

export interface RateLimitRule {
  action: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitInput extends RateLimitRule {
  context: AuditActionContext;
  userId?: string | null;
}

export const rateLimitRules = {
  register: { action: "auth.register", limit: 5, windowSeconds: 30 * 60 },
  login: { action: "auth.login", limit: 10, windowSeconds: 15 * 60 },
  emailCode: { action: "email.code", limit: 3, windowSeconds: 10 * 60 },
  emailChange: { action: "email.change", limit: 3, windowSeconds: 15 * 60 },
  passwordChange: { action: "password.change", limit: 5, windowSeconds: 30 * 60 },
  accountDelete: { action: "account.delete", limit: 5, windowSeconds: 30 * 60 },
  search: { action: "search.public", limit: 60, windowSeconds: 10 * 60 },
  post: { action: "post.write", limit: 10, windowSeconds: 60 * 60 },
  comment: { action: "comment.write", limit: 30, windowSeconds: 60 * 60 },
  reaction: { action: "reaction.write", limit: 120, windowSeconds: 60 * 60 },
  follow: { action: "follow.write", limit: 50, windowSeconds: 60 * 60 },
  report: { action: "report.create", limit: 10, windowSeconds: 60 * 60 },
  avatarUpload: { action: "avatar.upload", limit: 10, windowSeconds: 60 * 60 },
  postImageUpload: { action: "post_image.upload", limit: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export async function enforceRateLimit(input: RateLimitInput) {
  const since = new Date(Date.now() - input.windowSeconds * 1000);
  const hasTrustworthyIp = input.context.ip !== "direct" && input.context.ip !== "unknown";
  const identityFilters = [
    input.userId ? { userId: input.userId } : null,
    !input.userId || hasTrustworthyIp ? { ip: input.context.ip } : null,
  ].filter(Boolean) as Array<{ userId: string } | { ip: string }>;

  const attempts = await db.rateLimitEvent.count({
    where: {
      action: input.action,
      createdAt: { gte: since },
      OR: identityFilters,
    },
  });

  const blocked = attempts >= input.limit;

  await db.rateLimitEvent.create({
    data: {
      userId: input.userId ?? undefined,
      ip: input.context.ip,
      action: input.action,
      route: input.context.route,
    },
  });

  if (!blocked) {
    return { ok: true as const };
  }

  await db.securityEvent.create({
    data: {
      userId: input.userId ?? undefined,
      ip: input.context.ip,
      userAgent: input.context.userAgent,
      type: SecurityEventType.RATE_LIMIT_TRIGGERED,
      severity: SecuritySeverity.MEDIUM,
      metadata: {
        action: input.action,
        route: input.context.route,
        limit: input.limit,
        windowSeconds: input.windowSeconds,
      },
    },
  });

  return {
    ok: false as const,
    message: "Слишком много действий. Попробуйте позже.",
  };
}
