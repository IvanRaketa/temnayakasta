import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const sessionRepository = {
  findByTokenHash(tokenHash: string) {
    return db.userSession.findUnique({ where: { tokenHash } });
  },

  listActiveByUser(userId: string, now = new Date()) {
    return db.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: now },
      },
      orderBy: { lastSeenAt: "desc" },
    });
  },

  create(data: Prisma.UserSessionCreateInput) {
    return db.userSession.create({ data });
  },

  updateActivity(id: string, lastSeenAt: Date, expiresAt: Date) {
    return db.userSession.update({
      where: { id },
      data: { lastSeenAt, expiresAt },
    });
  },

  revoke(id: string, revokedAt = new Date()) {
    return db.userSession.update({
      where: { id },
      data: { isRevoked: true, revokedAt },
    });
  },

  revokeAllForUser(userId: string, revokedAt = new Date()) {
    return db.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt },
    });
  },
};
