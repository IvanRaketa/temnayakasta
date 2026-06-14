import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const auditLogRepository = {
  create(data: Prisma.AuditLogCreateInput) {
    return db.auditLog.create({ data });
  },

  listByUser(userId: string, take = 50) {
    return db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  },
};
