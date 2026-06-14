import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const securityEventRepository = {
  create(data: Prisma.SecurityEventCreateInput) {
    return db.securityEvent.create({ data });
  },

  listByUser(userId: string, take = 50) {
    return db.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  },
};
