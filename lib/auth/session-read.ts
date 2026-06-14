import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { hashSessionToken } from "@/lib/auth/session-token";
import { db } from "@/lib/db";
import { UserStatus } from "@/lib/generated/prisma/client";

export async function getCurrentSessionReadOnly() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await db.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { profile: true } } },
  });

  if (
    !session ||
    session.isRevoked ||
    session.expiresAt <= new Date() ||
    session.user.deletedAt ||
    session.user.status === UserStatus.BANNED
  ) {
    return null;
  }

  return { session, user: session.user };
}
