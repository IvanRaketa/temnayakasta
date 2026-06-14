import { NextResponse } from "next/server";

import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { PostStatus, UserInterestEventType } from "@/lib/generated/prisma/client";
import { recordInterestEvent } from "@/lib/recommendations/interest-events";

const MAX_DWELL_SECONDS = 30 * 60;
const QUICK_SKIP_SECONDS = 8;
const DWELL_TIME_SECONDS = 15;

function parseDwellSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(Math.round(value), MAX_DWELL_SECONDS));
}

export async function POST(request: Request) {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const payload = body as { postId?: unknown; activeSeconds?: unknown };
  const postId = typeof payload.postId === "string" ? payload.postId.trim() : "";
  const activeSeconds = parseDwellSeconds(payload.activeSeconds);

  if (!postId || activeSeconds === null) {
    return NextResponse.json({ error: "Invalid interest event." }, { status: 400 });
  }

  const post = await db.post.findFirst({
    where: {
      id: postId,
      status: PostStatus.PUBLISHED,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!post || post.authorId === current.user.id) {
    return new NextResponse(null, { status: 204 });
  }

  if (activeSeconds <= QUICK_SKIP_SECONDS) {
    await recordInterestEvent({
      userId: current.user.id,
      type: UserInterestEventType.QUICK_SKIP,
      postId: post.id,
      authorId: post.authorId,
      value: activeSeconds,
    });
  } else if (activeSeconds >= DWELL_TIME_SECONDS) {
    await recordInterestEvent({
      userId: current.user.id,
      type: UserInterestEventType.DWELL_TIME,
      postId: post.id,
      authorId: post.authorId,
      value: activeSeconds,
    });
  }

  return new NextResponse(null, { status: 204 });
}
