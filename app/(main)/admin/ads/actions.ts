"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createAuditActionContext } from "@/lib/audit/action-context";
import { validateAdTargetUrl } from "@/lib/ads/url";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, type Prisma } from "@/lib/generated/prisma/client";
import { validateImageUpload } from "@/lib/uploads/image-validation";

const adPlacements = new Set<string>(Object.values(AdPlacement));
const maxUploadSize = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["jpg", "png", "webp", "gif"] as const);

async function requireAdsAdmin(route: string) {
  const current = await getCurrentSessionReadOnly();
  if (!current || !current.user.emailVerified || !isAdmin(current.user)) notFound();

  const context = createAuditActionContext(await headers(), route, "POST");
  return { current, context };
}

async function auditAdsAction(
  action: string,
  adminId: string,
  context: Awaited<ReturnType<typeof requireAdsAdmin>>["context"],
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

function redirectWithError(message: string): never {
  redirect(`/admin/ads?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, name: string, maxLength: number, required = false) {
  const value = String(formData.get(name) ?? "").trim();
  if (required && !value) redirectWithError("Заполните обязательные поля рекламы.");
  if (value.length > maxLength) redirectWithError("Одно из полей рекламы слишком длинное.");
  return value;
}

function optionalTextField(formData: FormData, name: string, maxLength: number) {
  const value = textField(formData, name, maxLength);
  return value || null;
}

function dateField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) redirectWithError("Укажите корректные даты рекламы.");

  return date;
}

function placementField(formData: FormData) {
  const value = String(formData.get("placement") ?? "").trim();
  if (!adPlacements.has(value)) redirectWithError("Выберите корректное место показа рекламы.");

  return value as AdPlacement;
}

function adDataFromForm(formData: FormData) {
  const title = textField(formData, "title", 140, true);
  const target = validateAdTargetUrl(textField(formData, "targetUrl", 2048, true));
  if (!target.ok) redirectWithError(target.message);

  const imageUrl = optionalTextField(formData, "imageUrl", 2048);
  if (imageUrl) {
    const imageTarget = validateAdTargetUrl(imageUrl);
    if (!imageTarget.ok) {
      redirectWithError("Ссылка на изображение должна быть внутренним путём или корректным URL.");
    }
  }

  const startsAt = dateField(formData, "startsAt");
  const endsAt = dateField(formData, "endsAt");
  if (startsAt && endsAt && startsAt > endsAt) {
    redirectWithError("Дата начала рекламы не может быть позже даты окончания.");
  }

  return {
    title,
    description: optionalTextField(formData, "description", 600),
    imageUrl,
    targetUrl: target.targetUrl,
    placement: placementField(formData),
    advertiserName: optionalTextField(formData, "advertiserName", 160),
    erid: optionalTextField(formData, "erid", 160),
    startsAt,
    endsAt,
    isActive: formData.get("isActive") === "on",
  };
}

function revalidateAdSurfaces() {
  revalidatePath("/admin/ads");
  revalidatePath("/");
  revalidatePath("/new");
  revalidatePath("/popular");
  revalidatePath("/feed/following");
  revalidatePath("/post/[slug]", "page");
}

export async function createAdvertisement(formData: FormData) {
  const { current, context } = await requireAdsAdmin("/admin/ads/create");
  const data = adDataFromForm(formData);

  const ad = await db.advertisement.create({
    data,
    select: { id: true, title: true, placement: true, isActive: true },
  });

  await auditAdsAction("ADMIN_AD_CREATED", current.user.id, context, ad);
  revalidateAdSurfaces();
}

export async function updateAdvertisement(formData: FormData) {
  const id = textField(formData, "id", 80, true);
  const { current, context } = await requireAdsAdmin("/admin/ads/update");
  const data = adDataFromForm(formData);

  const existing = await db.advertisement.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) notFound();

  const ad = await db.advertisement.update({
    where: { id },
    data,
    select: { id: true, title: true, placement: true, isActive: true },
  });

  await auditAdsAction("ADMIN_AD_UPDATED", current.user.id, context, {
    ...ad,
    previousTitle: existing.title,
  });
  revalidateAdSurfaces();
}

export async function toggleAdvertisement(formData: FormData) {
  const id = textField(formData, "id", 80, true);
  const { current, context } = await requireAdsAdmin("/admin/ads/toggle");

  const existing = await db.advertisement.findUnique({
    where: { id },
    select: { id: true, title: true, isActive: true },
  });
  if (!existing) notFound();

  const ad = await db.advertisement.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true, title: true, isActive: true },
  });

  await auditAdsAction("ADMIN_AD_TOGGLED", current.user.id, context, ad);
  revalidateAdSurfaces();
}

export async function deleteAdvertisement(formData: FormData) {
  const id = textField(formData, "id", 80, true);
  const { current, context } = await requireAdsAdmin("/admin/ads/delete");

  const existing = await db.advertisement.findUnique({
    where: { id },
    select: { id: true, title: true, endsAt: true },
  });
  if (!existing) notFound();

  const ad = await db.advertisement.update({
    where: { id },
    data: {
      isActive: false,
      endsAt: existing.endsAt ?? new Date(),
    },
    select: { id: true, title: true, isActive: true, endsAt: true },
  });

  await auditAdsAction("ADMIN_AD_SOFT_DELETED", current.user.id, context, ad);
  revalidateAdSurfaces();
}

export async function uploadAdvertisementImage(formData: FormData) {
  await requireAdsAdmin("/admin/ads/upload");

  const file = formData.get("adImage");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("Выберите изображение баннера.");
  }

  const image = await validateImageUpload({
    file,
    maxSizeBytes: maxUploadSize,
    allowedExtensions: allowedImageTypes,
    requireFileExtensionMatch: true,
  });
  if (!image.ok) {
    redirectWithError(
      image.reason === "file_too_large"
        ? "Размер баннера должен быть не больше 5 МБ."
        : "Разрешены только настоящие jpg, jpeg, png, webp и gif без SVG/скриптов.",
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "ads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${image.extension}`;
  const fullPath = path.join(uploadDir, filename);
  const safeRoot = path.resolve(uploadDir);
  const safePath = path.resolve(fullPath);
  if (!safePath.startsWith(`${safeRoot}${path.sep}`)) notFound();

  await writeFile(safePath, image.bytes);

  redirect(`/admin/ads?image=${encodeURIComponent(`/uploads/ads/${filename}`)}`);
}
