import { getSessionExpiresAt, shouldRefreshSessionActivity } from "@/lib/auth/session-cookie";
import { createSessionToken, hashSessionToken } from "@/lib/auth/session-token";
import { sessionRepository } from "@/lib/repositories/session.repository";

export const sessionService = {
  createSessionToken,
  hashSessionToken,

  getActiveUserSessions(userId: string) {
    return sessionRepository.listActiveByUser(userId);
  },

  revokeSession(sessionId: string) {
    return sessionRepository.revoke(sessionId);
  },

  revokeAllUserSessions(userId: string) {
    return sessionRepository.revokeAllForUser(userId);
  },

  async touchSession(sessionId: string, lastSeenAt: Date) {
    const now = new Date();

    if (!shouldRefreshSessionActivity(lastSeenAt, now)) {
      return null;
    }

    return sessionRepository.updateActivity(sessionId, now, getSessionExpiresAt(now));
  },
};
