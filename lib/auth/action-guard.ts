import type { AuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";
import { SecurityEventType, SecuritySeverity, UserStatus, type User } from "@/lib/generated/prisma/client";

type GuardUser = Pick<User, "id" | "status">;

export type ProtectedAction =
  | "post"
  | "comment"
  | "reaction"
  | "follow"
  | "report"
  | "profile";

const mutedActions: ProtectedAction[] = ["post", "comment", "reaction", "follow", "profile"];
const limitedMessages: Partial<Record<ProtectedAction, string>> = {
  post: "Аккаунт ограничен: публикации доступны только в пределах лимитов.",
  comment: "Аккаунт ограничен: комментарии доступны только в пределах лимитов.",
};

export async function guardUserStatus(
  user: GuardUser,
  action: ProtectedAction,
  context: AuditActionContext,
) {
  if (user.status === UserStatus.ACTIVE) {
    return { ok: true as const };
  }

  if (user.status === UserStatus.LIMITED) {
    return { ok: true as const, message: limitedMessages[action] };
  }

  const blocked =
    user.status === UserStatus.BANNED ||
    (user.status === UserStatus.MUTED && mutedActions.includes(action));

  if (!blocked) {
    return { ok: true as const };
  }

  await db.securityEvent.create({
    data: {
      userId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
      type: user.status === UserStatus.BANNED ? SecurityEventType.SUSPICIOUS_ACTIVITY : SecurityEventType.SPAM_ATTEMPT,
      severity: user.status === UserStatus.BANNED ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM,
      metadata: {
        action,
        route: context.route,
        userStatus: user.status,
      },
    },
  });

  return {
    ok: false as const,
    message:
      user.status === UserStatus.BANNED
        ? "Аккаунт заблокирован."
        : "Аккаунт ограничен: это действие недоступно.",
  };
}
