import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { isPrismaUniqueConstraintError } from "@/lib/db/prisma-errors";
import { UserInterestEventType } from "@/lib/generated/prisma/client";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";
import { getClientIp } from "@/lib/request/get-client-ip";

const PROFILE_VIEW_DEDUPE_MS = 30 * 60 * 1000;

export async function recordProfileView(input: {
  profileUserId: string;
  viewerId?: string;
  headers: Headers;
}) {
  if (input.viewerId && input.viewerId === input.profileUserId) {
    return;
  }

  const ip = getClientIp(input.headers);
  const userAgent = input.headers.get("user-agent") ?? undefined;
  const visitorKey = input.viewerId
    ? undefined
    : createHash("sha256")
        .update(`${ip}:${userAgent ?? "unknown"}`)
        .digest("hex");

  try {
    const recentDuplicate = await db.profileView.findFirst({
      where: {
        profileUserId: input.profileUserId,
        ...(input.viewerId ? { viewerId: input.viewerId } : { visitorKey }),
        createdAt: { gte: new Date(Date.now() - PROFILE_VIEW_DEDUPE_MS) },
      },
      select: { id: true },
    });

    if (!recentDuplicate) {
      await db.profileView.create({
        data: {
          profileUserId: input.profileUserId,
          viewerId: input.viewerId,
          visitorKey,
          ip,
          userAgent,
        },
      });
    }
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      console.error("Failed to record profile view", error);
    }
  }

  await recordInterestEvent({
    userId: input.viewerId,
    type: UserInterestEventType.PROFILE_VIEW,
    authorId: input.profileUserId,
  });
}
