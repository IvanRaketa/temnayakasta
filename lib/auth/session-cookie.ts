export const SESSION_COOKIE_NAME = "tk_session";
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export function getSessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function shouldRefreshSessionActivity(lastSeenAt: Date, now = new Date()): boolean {
  const refreshThresholdMs = 5 * 60 * 1000;
  return now.getTime() - lastSeenAt.getTime() >= refreshThresholdMs;
}

export function getSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(new Date(0)),
    maxAge: 0,
  };
}
