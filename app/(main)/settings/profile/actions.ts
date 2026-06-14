"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import type { FormState } from "@/app/(auth)/form-state";
import { createAuditActionContext } from "@/lib/audit/action-context";
import { guardUserStatus } from "@/lib/auth/action-guard";
import { verifyPassword } from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/auth/validation";
import { getVerifiedSessionForAction } from "@/lib/auth/verified";
import {
  createSixDigitCode,
  getVerificationCodeExpiresAt,
  getVerificationCodeResendAvailableAt,
  hashVerificationCode,
  verifyVerificationCode,
  VERIFICATION_CODE_MAX_ATTEMPTS,
} from "@/lib/auth/verification-code";
import { db } from "@/lib/db";
import { emailChangeTemplate } from "@/lib/email/templates";
import { isMailDeliveryError, sendMail } from "@/lib/email/mailer";
import {
  SecurityEventType,
  SecuritySeverity,
  VerificationCodeType,
} from "@/lib/generated/prisma/client";
import { combineFilterResults, evaluateContentFilter } from "@/lib/moderation/content-filter";
import { isPremiumActive, normalizePremiumNameEffect } from "@/lib/premium";
import { enforceRateLimit, rateLimitRules } from "@/lib/security/rate-limit";
import { validateImageUpload } from "@/lib/uploads/image-validation";

const BIO_MAX_LENGTH = 500;
const DISPLAY_NAME_MAX_LENGTH = 50;
const AVATAR_MAX_SIZE = 1 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const avatarImageTypes = new Set(["jpg", "png", "webp"] as const);

async function actionContext(route = "/settings/profile") {
  return createAuditActionContext(await headers(), route, "POST");
}

function mailFormError(error: unknown): FormState {
  if (isMailDeliveryError(error)) {
    return { ok: false, message: error.userMessage };
  }

  console.error("[settings/profile] Mail action failed", error);
  return {
    ok: false,
    message: "Не удалось отправить письмо. Подробности есть в консоли сервера.",
  };
}

function profileSaveError(error: unknown): FormState {
  console.error("[settings/profile] Profile update failed", error);
  return {
    ok: false,
    message: "Не удалось сохранить профиль. Подробности есть в консоли сервера.",
  };
}

function cleanOptional(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "")
    .trim()
    .normalize("NFKC");
  return text ? text.slice(0, maxLength) : null;
}

async function saveAvatar(file: File) {
  const image = await validateImageUpload({
    file,
    maxSizeBytes: AVATAR_MAX_SIZE,
    allowedExtensions: avatarImageTypes,
  });

  if (!image.ok) {
    return {
      error:
        image.reason === "file_too_large"
          ? "Аватар должен быть не больше 1 МБ."
          : "Поддерживаются только JPG, PNG и WebP без SVG/скриптов.",
      reason: `avatar_${image.reason}`,
    };
  }

  return { url: `data:${image.mimeType};base64,${image.bytes.toString("base64")}` };
}

export async function updateProfileAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { current, error } = await getVerifiedSessionForAction("/settings/profile", "POST");
  if (!current) return { ok: false, message: error };

  const context = await actionContext();
  const guard = await guardUserStatus(current.user, "profile", context);
  if (!guard.ok) return { ok: false, message: guard.message };

  const displayName = cleanOptional(formData.get("displayName"), DISPLAY_NAME_MAX_LENGTH);
  const requestedPremiumNameEffect = normalizePremiumNameEffect(formData.get("premiumNameEffect"));
  const premiumNameEffect = isPremiumActive(current.user) ? requestedPremiumNameEffect : "none";
  const bioRaw = String(formData.get("bio") ?? "")
    .trim()
    .normalize("NFKC");
  const bio = bioRaw || null;
  const fieldErrors: Record<string, string> = {};

  if (bioRaw.length > BIO_MAX_LENGTH) {
    fieldErrors.bio = `Bio не длиннее ${BIO_MAX_LENGTH} символов.`;
  }

  if (
    String(formData.get("displayName") ?? "")
      .trim()
      .normalize("NFKC").length > DISPLAY_NAME_MAX_LENGTH
  ) {
    fieldErrors.displayName = `Отображаемое имя не длиннее ${DISPLAY_NAME_MAX_LENGTH} символов.`;
  }

  const filter = combineFilterResults([
    evaluateContentFilter({ kind: "displayName", text: displayName ?? "" }),
    evaluateContentFilter({ kind: "profile", text: bio ?? "" }),
  ]);

  if (filter.decision !== "ALLOW") {
    if (filter.decision === "BLOCK") {
      await db.securityEvent.create({
        data: {
          userId: current.user.id,
          ip: context.ip,
          userAgent: context.userAgent,
          type: SecurityEventType.SPAM_ATTEMPT,
          severity: SecuritySeverity.MEDIUM,
          metadata: {
            route: context.route,
            reasons: filter.reasons,
            action: "profile_update_blocked",
          },
        },
      });
    }
    fieldErrors.bio =
      "Публичные данные профиля выглядят подозрительно. Измените текст и попробуйте снова.";
  }

  const avatarFile = formData.get("avatar");
  let avatarUrl: string | undefined;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const limit = await enforceRateLimit({
      ...rateLimitRules.avatarUpload,
      context,
      userId: current.user.id,
    });
    if (!limit.ok) return { ok: false, message: limit.message };

    const avatar = await saveAvatar(avatarFile).catch((error) => {
      console.error("[settings/profile] Avatar upload failed", error);
      return {
        error: "Не удалось обработать аватар. Используйте JPG, PNG или WebP до 1 МБ.",
        reason: "avatar_processing_failed",
      };
    });
    if (avatar?.error) {
      fieldErrors.avatar = avatar.error;
      await db.securityEvent.create({
        data: {
          userId: current.user.id,
          ip: context.ip,
          userAgent: context.userAgent,
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.MEDIUM,
          metadata: {
            route: context.route,
            fileType: avatarFile.type,
            fileSize: avatarFile.size,
            reason: avatar.reason ?? "avatar_rejected",
          },
        },
      });
    }
    avatarUrl = avatar && "url" in avatar ? avatar.url : undefined;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: current.user.id },
        data: {
          bio,
          ...(avatarUrl ? { avatar: avatarUrl } : {}),
          profile: {
            upsert: {
              create: {
                displayName,
                bio,
                premiumNameEffect,
                ...(avatarUrl ? { avatar: avatarUrl } : {}),
              },
              update: {
                displayName,
                bio,
                premiumNameEffect,
                ...(avatarUrl ? { avatar: avatarUrl } : {}),
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: current.user.id,
          action: "PROFILE_UPDATED",
          ip: context.ip,
          userAgent: context.userAgent,
          route: context.route,
          method: context.method,
          metadata: {
            username: current.user.username,
            displayNameChanged: displayName !== current.user.profile?.displayName,
            premiumNameEffect,
          },
        },
      });

      if (avatarUrl) {
        await tx.auditLog.create({
          data: {
            userId: current.user.id,
            action: "AVATAR_CHANGED",
            ip: context.ip,
            userAgent: context.userAgent,
            route: context.route,
            method: context.method,
            metadata: { avatarStoredAs: "data_url", maxSizeBytes: AVATAR_MAX_SIZE },
          },
        });
      }
    });
  } catch (error) {
    return profileSaveError(error);
  }

  revalidatePath("/settings/profile");
  revalidatePath(`/profile/${current.user.username}`);
  return { ok: true, message: "Профиль обновлён." };
}

async function createEmailChangeCode(userId: string, currentEmail: string, targetEmail: string) {
  const now = new Date();
  const recent = await db.verificationCode.findFirst({
    where: {
      userId,
      type: VerificationCodeType.EMAIL_CHANGE,
      targetEmail,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent && recent.resendAvailableAt > now) {
    return { error: "Повторная отправка будет доступна через 60 секунд." };
  }

  const code = createSixDigitCode();
  await db.verificationCode.create({
    data: {
      userId,
      email: currentEmail,
      targetEmail,
      type: VerificationCodeType.EMAIL_CHANGE,
      codeHash: hashVerificationCode(code),
      resendAvailableAt: getVerificationCodeResendAvailableAt(now),
      expiresAt: getVerificationCodeExpiresAt(now),
    },
  });

  return { code };
}

export async function requestEmailChangeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { current, error } = await getVerifiedSessionForAction("/settings/profile/email", "POST");
  if (!current) return { ok: false, message: error };

  const context = await actionContext("/settings/profile/email");
  const guard = await guardUserStatus(current.user, "profile", context);
  if (!guard.ok) return { ok: false, message: guard.message };

  const limit = await enforceRateLimit({
    ...rateLimitRules.emailChange,
    context,
    userId: current.user.id,
  });
  if (!limit.ok) return { ok: false, message: limit.message };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newEmail = normalizeEmail(String(formData.get("newEmail") ?? ""));
  if (!currentPassword) {
    return { ok: false, fieldErrors: { currentPassword: "Введите текущий пароль." } };
  }

  if (!newEmail || newEmail.length > 254 || !emailPattern.test(newEmail)) {
    return { ok: false, fieldErrors: { newEmail: "Укажите корректный e-mail." } };
  }

  const passwordOk = await verifyPassword(currentPassword, current.user.passwordHash);
  if (!passwordOk) {
    await db.securityEvent.create({
      data: {
        userId: current.user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        type: SecurityEventType.FAILED_LOGIN,
        severity: SecuritySeverity.LOW,
        metadata: {
          route: context.route,
          reason: "email_change_current_password_failed",
        },
      },
    });
    return { ok: false, fieldErrors: { currentPassword: "Текущий пароль указан неверно." } };
  }

  if (newEmail === current.user.email) {
    return { ok: false, fieldErrors: { newEmail: "Это уже текущий e-mail." } };
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: newEmail, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, fieldErrors: { newEmail: "E-mail уже используется." } };
  }

  const result = await createEmailChangeCode(current.user.id, current.user.email, newEmail);
  if (result.error || !result.code) return { ok: false, message: result.error };

  try {
    await sendMail(
      newEmail,
      emailChangeTemplate({
        code: result.code,
        actionUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/settings/profile`,
      }),
    );
  } catch (error) {
    return mailFormError(error);
  }

  return { ok: true, message: "Код подтверждения отправлен на новый e-mail." };
}

export async function confirmEmailChangeAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { current, error } = await getVerifiedSessionForAction(
    "/settings/profile/email/confirm",
    "POST",
  );
  if (!current) return { ok: false, message: error };

  const context = await actionContext("/settings/profile/email/confirm");
  const guard = await guardUserStatus(current.user, "profile", context);
  if (!guard.ok) return { ok: false, message: guard.message };

  const newEmail = normalizeEmail(String(formData.get("newEmail") ?? ""));
  const code = String(formData.get("code") ?? "").trim();

  if (!newEmail || !emailPattern.test(newEmail)) {
    return { ok: false, fieldErrors: { newEmail: "Укажите новый e-mail." } };
  }

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, fieldErrors: { code: "Введите шестизначный код." } };
  }

  const record = await db.verificationCode.findFirst({
    where: {
      userId: current.user.id,
      email: current.user.email,
      targetEmail: newEmail,
      type: VerificationCodeType.EMAIL_CHANGE,
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

  const existing = await db.user.findFirst({
    where: {
      id: { not: current.user.id },
      email: { equals: newEmail, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, fieldErrors: { newEmail: "E-mail уже используется." } };
  }

  await db.$transaction([
    db.verificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: current.user.id },
      data: { email: newEmail, emailVerified: true },
    }),
    db.auditLog.create({
      data: {
        userId: current.user.id,
        action: "EMAIL_CHANGED",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
        metadata: { previousEmail: current.user.email, newEmail },
      },
    }),
  ]);

  revalidatePath("/settings/profile");
  return { ok: true, message: "E-mail изменён." };
}
