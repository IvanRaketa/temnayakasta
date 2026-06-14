import { headers } from "next/headers";
import { forbidden } from "next/navigation";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { SecurityEventType, SecuritySeverity } from "@/lib/generated/prisma/client";

export const UNVERIFIED_FULL_ACCESS_MESSAGE = "Подтвердите e-mail для полного доступа.";

export async function getVerifiedSessionForAction(
  route: string,
  method = "POST",
  options: { forbidUnverified?: boolean } = {},
) {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    return { current: null, error: "Войдите в аккаунт, чтобы выполнить действие." };
  }

  if (current.user.emailVerified) {
    return { current, error: null };
  }

  const context = createAuditActionContext(await headers(), route, method);
  await db.auditLog.create({
    data: {
      userId: current.user.id,
      action: "LOGIN_BLOCKED_UNVERIFIED",
      ip: context.ip,
      userAgent: context.userAgent,
      route: context.route,
      method: context.method,
    },
  });
  await db.securityEvent.create({
    data: {
      userId: current.user.id,
      ip: context.ip,
      userAgent: context.userAgent,
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.LOW,
      metadata: {
        action: "unverified_account_action",
        route: context.route,
      },
    },
  });

  if (options.forbidUnverified) {
    forbidden();
  }

  return { current: null, error: UNVERIFIED_FULL_ACCESS_MESSAGE };
}
