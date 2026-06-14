import { cookies } from "next/headers";

import { getSessionCookieOptions, getSessionExpiresAt, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { hashSessionToken } from "@/lib/auth/session-token";
import { db } from "@/lib/db";
import { UserStatus } from "@/lib/generated/prisma/client";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await db.userSession.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });

  if (
    !session ||
    session.isRevoked ||
    session.expiresAt <= new Date() ||
    session.user.deletedAt ||
    session.user.status === UserStatus.BANNED
  ) {
    if (session?.user.status === UserStatus.BANNED && !session.isRevoked) {
      await db.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    }
    cookieStore.set(SESSION_COOKIE_NAME, "", { ...getSessionCookieOptions(new Date(0)), maxAge: 0 });
    return null;
  }

  const now = new Date();
  const expiresAt = getSessionExpiresAt(now);

  await db.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: now, expiresAt },
  });
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));

  return { session: { ...session, lastSeenAt: now, expiresAt }, user: session.user };
}
