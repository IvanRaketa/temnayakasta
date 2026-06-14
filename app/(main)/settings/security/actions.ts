"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { guardUserStatus } from "@/lib/auth/action-guard";
import { getCurrentSession } from "@/lib/auth/current-session";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import { getExpiredSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";
import { SecurityEventType, SecuritySeverity } from "@/lib/generated/prisma/client";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";

async function context() {
  return createAuditActionContext(await headers(), "/settings/security", "POST");
}

export async function logoutAction() {
  const current = await getCurrentSession();
  const cookieStore = await cookies();
  const actionContext = await context();

  if (current) {
    await db.userSession.update({
      where: { id: current.session.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        userId: current.user.id,
        action: "auth.logout",
        ip: actionContext.ip,
        userAgent: actionContext.userAgent,
        route: actionContext.route,
        method: actionContext.method,
      },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  redirect("/login");
}

export async function revokeSessionAction(formData: FormData) {
  const current = await getCurrentSession();
  if (!current) redirect("/login");

  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId || sessionId === current.session.id) redirect("/settings/security");

  const actionContext = await context();
  await db.userSession.updateMany({
    where: { id: sessionId, userId: current.user.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });
  await db.auditLog.create({
    data: {
      userId: current.user.id,
      action: "auth.session.revoke",
      ip: actionContext.ip,
      userAgent: actionContext.userAgent,
      route: actionContext.route,
      method: actionContext.method,
      metadata: { sessionId },
    },
  });

  redirect("/settings/security");
}

export async function revokeOtherSessionsAction() {
  const current = await getCurrentSession();
  if (!current) redirect("/login");

  const actionContext = await context();
  await db.userSession.updateMany({
    where: {
      userId: current.user.id,
      isRevoked: false,
      id: { not: current.session.id },
    },
    data: { isRevoked: true, revokedAt: new Date() },
  });
  await db.auditLog.create({
    data: {
      userId: current.user.id,
      action: "auth.sessions.revoke_others",
      ip: actionContext.ip,
      userAgent: actionContext.userAgent,
      route: actionContext.route,
      method: actionContext.method,
    },
  });

  redirect("/settings/security");
}

export async function changePasswordAction(formData: FormData) {
  const current = await getCurrentSession();
  if (!current) redirect("/login");
  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction("/settings/security/password", "POST");
    redirect("/settings/security?passwordError=email");
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirmation = String(formData.get("newPasswordConfirmation") ?? "");
  const revokeOthers = formData.get("revokeOthers") === "on";
  const actionContext = await context();

  const limit = await enforceRateLimit({
    ...rateLimitRules.passwordChange,
    context: actionContext,
    userId: current.user.id,
  });
  if (!limit.ok) redirect("/settings/security?passwordError=rate");

  const guard = await guardUserStatus(current.user, "profile", actionContext);
  if (!guard.ok) redirect("/settings/security?passwordError=status");

  const passwordOk = await verifyPassword(currentPassword, current.user.passwordHash);
  if (!passwordOk) {
    await db.securityEvent.create({
      data: {
        userId: current.user.id,
        ip: actionContext.ip,
        userAgent: actionContext.userAgent,
        type: SecurityEventType.FAILED_LOGIN,
        severity: SecuritySeverity.LOW,
        metadata: {
          route: "/settings/security/password",
          reason: "password_change_current_password_failed",
        },
      },
    });
    redirect("/settings/security?passwordError=current");
  }
  if (newPassword.length < 8) redirect("/settings/security?passwordError=length");
  if (newPassword.length > 128) redirect("/settings/security?passwordError=tooLong");
  if (newPassword !== newPasswordConfirmation) redirect("/settings/security?passwordError=match");

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: current.user.id },
      data: { passwordHash },
    });

    if (revokeOthers) {
      await tx.userSession.updateMany({
        where: {
          userId: current.user.id,
          id: { not: current.session.id },
          isRevoked: false,
        },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: current.user.id,
        action: "PASSWORD_CHANGED",
        ip: actionContext.ip,
        userAgent: actionContext.userAgent,
        route: actionContext.route,
        method: actionContext.method,
        metadata: { revokedOtherSessions: revokeOthers },
      },
    });
  });

  redirect("/settings/security?passwordChanged=1");
}

export async function deleteAccountAction(formData: FormData) {
  const current = await getCurrentSession();
  if (!current) redirect("/login");
  if (!current.user.emailVerified) {
    await getVerifiedSessionForAction("/settings/security/delete", "POST");
    redirect("/settings/security?deleteError=email");
  }

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const actionContext = await context();

  const limit = await enforceRateLimit({
    ...rateLimitRules.accountDelete,
    context: actionContext,
    userId: current.user.id,
  });
  if (!limit.ok) redirect("/settings/security?deleteError=rate");

  if (confirmation !== "УДАЛИТЬ") redirect("/settings/security?deleteError=confirmation");

  const passwordOk = await verifyPassword(password, current.user.passwordHash);
  if (!passwordOk) {
    await db.securityEvent.create({
      data: {
        userId: current.user.id,
        ip: actionContext.ip,
        userAgent: actionContext.userAgent,
        type: SecurityEventType.FAILED_LOGIN,
        severity: SecuritySeverity.LOW,
        metadata: {
          route: "/settings/security/delete",
          reason: "delete_account_password_failed",
        },
      },
    });
    redirect("/settings/security?deleteError=password");
  }

  const guard = await guardUserStatus(current.user, "profile", actionContext);
  if (!guard.ok) redirect("/settings/security?deleteError=status");

  await db.user.update({
    where: { id: current.user.id },
    data: {
      deletedAt: new Date(),
      deletedBy: current.user.id,
      profile: {
        upsert: {
          create: { isHidden: true, displayName: current.user.username },
          update: { isHidden: true },
        },
      },
      sessions: {
        updateMany: {
          where: { isRevoked: false },
          data: { isRevoked: true, revokedAt: new Date() },
        },
      },
    },
  });
  await db.auditLog.create({
    data: {
      userId: current.user.id,
      action: "auth.account.delete",
      ip: actionContext.ip,
      userAgent: actionContext.userAgent,
      route: actionContext.route,
      method: actionContext.method,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  redirect("/login");
}
