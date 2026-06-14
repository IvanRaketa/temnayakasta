import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { isPrismaUniqueConstraintError } from "@/lib/db/prisma-errors";
import { UserInterestEventType } from "@/lib/generated/prisma/client";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";
import { getClientIp } from "@/lib/request/get-client-ip";

export async function recordPostView(input: {
  postId: string;
  authorId: string;
  viewerId?: string;
  headers: Headers;
}) {
  if (input.viewerId && input.viewerId === input.authorId) {
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
    const existingView = await db.postView.findFirst({
      where: {
        postId: input.postId,
        ...(input.viewerId ? { userId: input.viewerId } : { visitorKey }),
      },
      select: { id: true },
    });

    if (!existingView) {
      await db.postView.create({
        data: {
          postId: input.postId,
          userId: input.viewerId,
          visitorKey,
          ip,
          userAgent,
        },
      });
    }
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) {
      console.error("Failed to record post view", error);
    }
  }

  await recordInterestEvent({
    userId: input.viewerId,
    type: UserInterestEventType.POST_VIEW,
    postId: input.postId,
    authorId: input.authorId,
  });
}
