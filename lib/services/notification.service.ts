import { notificationRepository } from "@/lib/repositories/notification.repository";

export const notificationService = {
  getUserNotifications(userId: string) {
    return notificationRepository.listByUser(userId);
  },

  getUnreadUserNotifications(userId: string) {
    return notificationRepository.listUnreadByUser(userId);
  },
};
