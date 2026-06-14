import { auditLogRepository } from "@/lib/repositories/audit-log.repository";

export const auditService = {
  getUserAuditLog(userId: string) {
    return auditLogRepository.listByUser(userId);
  },
};
