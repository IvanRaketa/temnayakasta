"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { createAuditActionContext } from "@/lib/audit/action-context";
import { db } from "@/lib/db";

export async function markNotificationReadAction(formData: FormData) {
  const id = String(formData.get("notificationId") ?? "").trim();
  const current = await getCurrentSessionReadOnly();

  if (!current || !id) {
    notFound();
  }

  await db.notification.updateMany({
    where: {
      id,
      userId: current.user.id,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    notFound();
  }

  const context = createAuditActionContext(await headers(), "/notifications", "POST");

  await db.$transaction([
    db.notification.updateMany({
      where: {
        userId: current.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    }),
    db.auditLog.create({
      data: {
        userId: current.user.id,
        action: "notification.mark_all_read",
        ip: context.ip,
        userAgent: context.userAgent,
        route: context.route,
        method: context.method,
      },
    }),
  ]);

  revalidatePath("/notifications");
}
