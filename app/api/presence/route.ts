import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import {
  getPresenceSnapshot,
  getPresenceStats,
  leavePresence,
  upsertPresence,
} from "@/lib/presence/db-store";
import { normalizePresenceInput, type PresenceInput } from "@/lib/presence/store";
import { getClientIp } from "@/lib/request/get-client-ip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRESENCE_GET_LIMIT = 120;
const PRESENCE_POST_LIMIT = 240;
const PRESENCE_RATE_WINDOW_MS = 60_000;

const globalForPresenceRateLimit = globalThis as unknown as {
  tkPresenceRateLimit?: Map<string, { count: number; resetAt: number }>;
};

const presenceRateLimit =
  globalForPresenceRateLimit.tkPresenceRateLimit ??
  new Map<string, { count: number; resetAt: number }>();

if (process.env.NODE_ENV !== "production") {
  globalForPresenceRateLimit.tkPresenceRateLimit = presenceRateLimit;
}

async function getPresenceUserId() {
  try {
    const current = await getCurrentSessionReadOnly();

    return current?.user.id ?? null;
  } catch (error) {
    console.error("Presence session lookup failed", error);
    return null;
  }
}

function rateLimitKey(input: Pick<PresenceInput, "visitorId" | "userId">, request: Request) {
  if (input.userId) return `user:${input.userId}`;

  return `ip:${getClientIp(request.headers)}:${input.visitorId}`;
}

function checkPresenceRateLimit(key: string, limit: number) {
  const now = Date.now();

  for (const [entryKey, entry] of presenceRateLimit.entries()) {
    if (entry.resetAt <= now) {
      presenceRateLimit.delete(entryKey);
    }
  }

  const entry = presenceRateLimit.get(key);
  if (!entry || entry.resetAt <= now) {
    presenceRateLimit.set(key, { count: 1, resetAt: now + PRESENCE_RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

async function presenceLimitResponse(input: PresenceInput, status = 429) {
  return Response.json(
    {
      ok: false,
      message: "Presence temporarily unavailable.",
      stats: await getPresenceStats(),
      snapshot: await getPresenceSnapshot(input.scope, input.targetId),
    },
    {
      status,
      headers: { "Retry-After": "30" },
    },
  );
}

async function readPresenceBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  if (contentType.includes("form")) {
    const formData = await request.formData();

    return Object.fromEntries(formData.entries());
  }

  const text = await request.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeFromRecord(
  record: Record<string, unknown>,
  userId: string | null,
): PresenceInput {
  return normalizePresenceInput({
    visitorId: typeof record.visitorId === "string" ? record.visitorId : null,
    tabId: typeof record.tabId === "string" ? record.tabId : null,
    userId,
    scope: typeof record.scope === "string" ? record.scope : null,
    targetId: typeof record.targetId === "string" ? record.targetId : null,
    activity: typeof record.activity === "string" ? record.activity : null,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = await getPresenceUserId();
  const input = normalizePresenceInput({
    visitorId: url.searchParams.get("visitorId"),
    tabId: url.searchParams.get("tabId"),
    userId,
    scope: url.searchParams.get("scope"),
    targetId: url.searchParams.get("targetId"),
    activity: url.searchParams.get("activity"),
  });

  if (!checkPresenceRateLimit(rateLimitKey(input, request), PRESENCE_GET_LIMIT)) {
    return presenceLimitResponse(input);
  }

  await upsertPresence(input);

  return Response.json(await getPresenceSnapshot(input.scope, input.targetId), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(request: Request) {
  const userId = await getPresenceUserId();
  const body = await readPresenceBody(request).catch(() => null);
  if (!body) {
    return Response.json({ ok: false, message: "Invalid presence payload." }, { status: 400 });
  }

  const input = normalizeFromRecord(body, userId);

  if (!checkPresenceRateLimit(rateLimitKey(input, request), PRESENCE_POST_LIMIT)) {
    return presenceLimitResponse(input);
  }

  if (body.action === "leave") {
    await leavePresence(input);
  } else {
    await upsertPresence(input);
  }

  return Response.json(await getPresenceSnapshot(input.scope, input.targetId), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
