import { securityEventRepository } from "@/lib/repositories/security-event.repository";

export const securityService = {
  getUserSecurityEvents(userId: string) {
    return securityEventRepository.listByUser(userId);
  },
};
