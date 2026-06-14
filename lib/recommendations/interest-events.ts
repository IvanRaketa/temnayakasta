import { db } from "@/lib/db";
import { UserInterestEventType, type Prisma } from "@/lib/generated/prisma/client";

type InterestEventWriter = Pick<Prisma.TransactionClient, "userInterestEvent">;

const DEFAULT_DEDUPE_SECONDS: Record<UserInterestEventType, number> = {
  [UserInterestEventType.POST_VIEW]: 30 * 60,
  [UserInterestEventType.POST_LIKE]: 24 * 60 * 60,
  [UserInterestEventType.POST_DISLIKE]: 24 * 60 * 60,
  [UserInterestEventType.POST_COMMENT]: 0,
  [UserInterestEventType.PROFILE_VIEW]: 30 * 60,
  [UserInterestEventType.FOLLOW]: 0,
  [UserInterestEventType.TAG_CLICK]: 15 * 60,
  [UserInterestEventType.DWELL_TIME]: 6 * 60 * 60,
  [UserInterestEventType.QUICK_SKIP]: 6 * 60 * 60,
};

interface RecordInterestEventInput {
  client?: InterestEventWriter;
  userId?: string | null;
  type: UserInterestEventType;
  postId?: string | null;
  authorId?: string | null;
  tagId?: string | null;
  value?: number | null;
  dedupeSeconds?: number;
}

function normalizeValue(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(Math.round(value), 60 * 60));
}

export async function recordInterestEvent(input: RecordInterestEventInput) {
  if (!input.userId) {
    return false;
  }

  const client = input.client ?? db;
  const dedupeSeconds = input.dedupeSeconds ?? DEFAULT_DEDUPE_SECONDS[input.type];
  const target = {
    postId: input.postId ?? null,
    authorId: input.authorId ?? null,
    tagId: input.tagId ?? null,
  };

  try {
    if (dedupeSeconds > 0) {
      const recentDuplicate = await client.userInterestEvent.findFirst({
        where: {
          userId: input.userId,
          type: input.type,
          ...target,
          createdAt: {
            gte: new Date(Date.now() - dedupeSeconds * 1000),
          },
        },
        select: { id: true },
      });

      if (recentDuplicate) {
        return false;
      }
    }

    await client.userInterestEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        ...target,
        value: normalizeValue(input.value),
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to record interest event", error);
    return false;
  }
}
