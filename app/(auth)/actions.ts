"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  getSessionExpiresAt,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session-cookie";
import { createSessionToken, hashSessionToken } from "@/lib/auth/session-token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  normalizeEmail,
  validateEmailCode,
  validateLogin,
  validatePasswordReset,
  validateRegistration,
} from "@/lib/auth/validation";
import {
  createSixDigitCode,
  getVerificationCodeExpiresAt,
  getVerificationCodeResendAvailableAt,
  hashVerificationCode,
  verifyVerificationCode,
  VERIFICATION_CODE_MAX_ATTEMPTS,
} from "@/lib/auth/verification-code";
import { createAuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";
import { emailVerificationTemplate, passwordResetTemplate } from "@/lib/email/templates";
import { isMailDeliveryError, sendMail } from "@/lib/email/mailer";
import {
  SecurityEventType,
  SecuritySeverity,
  VerificationCodeType,
} from "@/lib/generated/prisma/client";
import { evaluateContentFilter } from "@/lib/moderation/content-filter";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";
import { REQUIRED_REGISTRATION_CONSENTS } from "@/lib/legal/documents";
import type { FormState } from "./form-state";

function unavailable(error: unknown): FormState {
  if (isMailDeliveryError(error)) {
    return {
      ok: false,
      message: error.userMessage,
    };
  }

  console.error(error);
  return {
    ok: false,
    message: "Сейчас не удалось выполнить действие. Проверьте подключение к базе данных.",
  };
}

async function requestContext(route: string, method = "POST") {
  return createAuditActionContext(await headers(), route, method);
}

async function createVerificationCode(input: {
  userId?: string;
  email: string;
  type: VerificationCodeType;
  targetEmail?: string;
}) {
  const now = new Date();
  const recent = await db.verificationCode.findFirst({
    where: {
      email: input.email,
      type: input.type,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent && recent.resendAvailableAt > now) {
    throw new Error("Повторная отправка будет доступна через минуту.");
  }

  const code = createSixDigitCode();
  await db.verificationCode.create({
    data: {
      userId: input.userId,
      email: input.email,
      targetEmail: input.targetEmail,
      type: input.type,
      codeHash: hashVerificationCode(code),
      resendAvailableAt: getVerificationCodeResendAvailableAt(now),
      expiresAt: getVerificationCodeExpiresAt(now),
    },
  });

  return code;
}

async function verifyCode(email: string, code: string, type: VerificationCodeType) {
  const record = await db.verificationCode.findFirst({
    where: {
      email,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, message: "Код не найден или истёк." };

  if (record.attempts >= VERIFICATION_CODE_MAX_ATTEMPTS) {
    return { ok: false, message: "Слишком много попыток. Запросите новый код." };
  }

  if (!verifyVerificationCode(code, record.codeHash)) {
    await db.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, message: "Неверный код." };
  }

  await db.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, record };
}

export async function registerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const validation = validateRegistration(formData);
  if (!validation.data) return { ok: false, fieldErrors: validation.errors };

  const { username, email, password } = validation.data;
  const context = await requestContext("/register");

  try {
    const limit = await enforceRateLimit({
      ...rateLimitRules.register,
      context,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    const usernameFilter = evaluateContentFilter({ kind: "username", text: username });
    if (usernameFilter.decision !== "ALLOW") {
      if (usernameFilter.decision === "BLOCK") {
        await db.securityEvent.create({
          data: {
            ip: context.ip,
            userAgent: context.userAgent,
            type: SecurityEventType.SPAM_ATTEMPT,
            severity: SecuritySeverity.MEDIUM,
            metadata: {
              route: context.route,
              reasons: usernameFilter.reasons,
              action: "registration_username_blocked",
            },
          },
        });
      }
      return { ok: false, fieldErrors: { username: "Выберите другой username." } };
    }

    const [usernameExists, emailExists] = await Promise.all([
      db.user.findUnique({ where: { username } }),
      db.user.findUnique({ where: { email } }),
    ]);

    if (usernameExists) return { ok: false, fieldErrors: { username: "Username уже занят." } };
    if (emailExists) return { ok: false, fieldErrors: { email: "Email уже используется." } };

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        emailVerified: false,
        profile: {
          create: {
            displayName: username,
          },
        },
        consentAcceptances: {
          create: REQUIRED_REGISTRATION_CONSENTS.map((document) => ({
            type: document.type,
            version: document.version,
            ip: context.ip,
            userAgent: context.userAgent,
          })),
        },
      },
    });

    const code = await createVerificationCode({
      userId: user.id,
      email,
      type: VerificationCodeType.EMAIL_VERIFICATION,
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.register",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: { email },
      },
    });
    await sendMail(
      email,
      emailVerificationTemplate({
        code,
        actionUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email?email=${encodeURIComponent(email)}`,
      }),
    );
  } catch (error) {
    return unavailable(error);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const validation = validateLogin(formData);
  if (!validation.data) return { ok: false, fieldErrors: validation.errors };

  const { identifier, password } = validation.data;
  const context = await requestContext("/login");

  try {
    const limit = await enforceRateLimit({
      ...rateLimitRules.login,
      context,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    const user = await db.user.findFirst({
      where: {
        OR: [{ email: normalizeEmail(identifier) }, { username: identifier }],
      },
    });

    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !passwordOk || user.deletedAt || user.status === "BANNED") {
      await Promise.all([
        db.rateLimitEvent.create({
          data: {
            userId: user?.id,
            ip: context.ip,
            action: "auth.login.failed",
            route: context.route,
          },
        }),
        db.securityEvent.create({
          data: {
            userId: user?.id,
            ip: context.ip,
            userAgent: context.userAgent,
            type:
              user?.status === "BANNED"
                ? SecurityEventType.ACCOUNT_BANNED
                : SecurityEventType.FAILED_LOGIN,
            severity: user?.status === "BANNED" ? SecuritySeverity.HIGH : SecuritySeverity.LOW,
            metadata: {
              route: context.route,
              reason: user?.status === "BANNED" ? "banned_user_login" : "invalid_credentials",
            },
          },
        }),
      ]);
      return { ok: false, message: "Неверный email, username или пароль." };
    }

    const token = createSessionToken();
    const expiresAt = getSessionExpiresAt();
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await db.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        ip: context.ip,
        userAgent: context.userAgent,
        deviceName: "Browser session",
        expiresAt,
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.login",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
    cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
  } catch (error) {
    return unavailable(error);
  }

  redirect("/");
}

export async function verifyEmailAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const validation = validateEmailCode(formData);
  if (!validation.data) return { ok: false, fieldErrors: validation.errors };

  const { email, code } = validation.data;
  const context = await requestContext("/verify-email");

  try {
    const result = await verifyCode(email, code, VerificationCodeType.EMAIL_VERIFICATION);
    if (!result.ok || !result.record) return { ok: false, message: result.message };

    const user = await db.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_CONFIRMED",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
      },
    });
  } catch (error) {
    return unavailable(error);
  }

  return { ok: true, message: "Email подтверждён. Теперь можно войти." };
}

export async function resendEmailVerificationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { ok: false, fieldErrors: { email: "Укажите email." } };
  const context = await requestContext("/verify-email");

  try {
    const user = await db.user.findUnique({ where: { email } });
    const limit = await enforceRateLimit({
      ...rateLimitRules.emailCode,
      context,
      userId: user?.id,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    if (!user || user.emailVerified || user.deletedAt) {
      return { ok: true, message: "Если аккаунт найден, новый код будет отправлен." };
    }

    const code = await createVerificationCode({
      userId: user.id,
      email,
      type: VerificationCodeType.EMAIL_VERIFICATION,
    });

    await sendMail(
      email,
      emailVerificationTemplate({
        code,
        actionUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email?email=${encodeURIComponent(email)}`,
      }),
    );
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_CODE_RESENT",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: { email },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Повторная отправка")) {
      return { ok: false, message: error.message };
    }
    return unavailable(error);
  }

  return { ok: true, message: "Если аккаунт найден, новый код будет отправлен." };
}

export async function requestPasswordResetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { ok: false, fieldErrors: { email: "Укажите email." } };
  const context = await requestContext("/forgot-password");

  try {
    const user = await db.user.findUnique({ where: { email } });
    const limit = await enforceRateLimit({
      ...rateLimitRules.emailCode,
      context,
      userId: user?.id,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    if (user && !user.deletedAt) {
      const code = await createVerificationCode({
        userId: user.id,
        email,
        type: VerificationCodeType.PASSWORD_RESET,
      });
      await sendMail(
        email,
        passwordResetTemplate({
          code,
          actionUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/forgot-password?email=${encodeURIComponent(email)}`,
        }),
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Повторная отправка")) {
      return { ok: false, message: error.message };
    }
    return unavailable(error);
  }

  return { ok: true, message: "Если email найден, код восстановления будет отправлен." };
}

export async function resetPasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const validation = validatePasswordReset(formData);
  if (!validation.data) return { ok: false, fieldErrors: validation.errors };

  const { email, code, password } = validation.data;
  const context = await requestContext("/forgot-password");

  try {
    const result = await verifyCode(email, code, VerificationCodeType.PASSWORD_RESET);
    if (!result.ok || !result.record) return { ok: false, message: result.message };

    const passwordHash = await hashPassword(password);
    const user = await db.user.update({
      where: { email },
      data: { passwordHash },
    });
    await db.userSession.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.password.reset",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
      },
    });
  } catch (error) {
    return unavailable(error);
  }

  return { ok: true, message: "Пароль обновлён. Войдите с новым паролем." };
}
