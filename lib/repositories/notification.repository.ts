import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const notificationRepository = {
  listByUser(userId: string) {
    return db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  listUnreadByUser(userId: string) {
    return db.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.NotificationCreateInput) {
    return db.notification.create({ data });
  },

  markRead(id: string) {
    return db.notification.update({ where: { id }, data: { isRead: true } });
  },
};
