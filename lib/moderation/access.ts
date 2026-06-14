import { notFound } from "next/navigation";

import { canModerate } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";

export async function requireModerator() {
  const current = await getCurrentSessionReadOnly();
  if (!current || !current.user.emailVerified || !canModerate(current.user)) notFound();
  return current;
}
