import { db } from "@/lib/db";
import type { PresenceInput, PresenceScope, PresenceSnapshot } from "@/lib/presence/store";

interface PresenceRow {
  identity: string;
  userId: string | null;
  scope: PresenceScope;
  targetId: string | null;
  activity: PresenceInput["activity"];
  lastSeenAt: Date;
}

const ONLINE_TIMEOUT_MS = 18_000;
const TYPING_TIMEOUT_MS = 4_000;

let tableReady: Promise<void> | null = null;

function identityFor(input: Pick<PresenceInput, "userId" | "visitorId">) {
  return input.userId ? `user:${input.userId}` : `visitor:${input.visitorId}`;
}

function keyFor(input: Pick<PresenceInput, "userId" | "visitorId" | "tabId">) {
  return `${identityFor(input)}:${input.tabId}`;
}

function isFresh(date: Date, timeoutMs: number, now = Date.now()) {
  return now - date.getTime() <= timeoutMs;
}

function safeScope(value: string | null): PresenceScope {
  if (value === "post" || value === "profile" || value === "create") return value;
  return "site";
}

function safeActivity(value: string): PresenceInput["activity"] {
  if (
    value === "reading_post" ||
    value === "viewing_profile" ||
    value === "commenting_post" ||
    value === "creating_post"
  ) {
    return value;
  }

  return "online";
}

async function ensurePresenceTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LivePresenceSession" (
          "key" TEXT PRIMARY KEY,
          "identity" TEXT NOT NULL,
          "visitorId" TEXT NOT NULL,
          "tabId" TEXT NOT NULL,
          "userId" TEXT,
          "scope" TEXT NOT NULL,
          "targetId" TEXT,
          "activity" TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "LivePresenceSession_lastSeenAt_idx" ON "LivePresenceSession" ("lastSeenAt")`,
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "LivePresenceSession_scope_target_idx" ON "LivePresenceSession" ("scope", "targetId")`,
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "LivePresenceSession_identity_idx" ON "LivePresenceSession" ("identity")`,
      );
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }

  return tableReady;
}

async function pruneExpiredSessions() {
  await ensurePresenceTable();
  await db.$executeRawUnsafe(
    `DELETE FROM "LivePresenceSession" WHERE "lastSeenAt" < NOW() - INTERVAL '45 seconds'`,
  );
}

async function readRows() {
  await pruneExpiredSessions();
  const rows = await db.$queryRawUnsafe<
    Array<{
      identity: string;
      userId: string | null;
      scope: string;
      targetId: string | null;
      activity: string;
      lastSeenAt: Date;
    }>
  >(
    `SELECT "identity", "userId", "scope", "targetId", "activity", "lastSeenAt" FROM "LivePresenceSession" WHERE "lastSeenAt" >= NOW() - INTERVAL '45 seconds'`,
  );

  return rows.map<PresenceRow>((row) => ({
    identity: row.identity,
    userId: row.userId,
    scope: safeScope(row.scope),
    targetId: row.targetId,
    activity: safeActivity(row.activity),
    lastSeenAt: row.lastSeenAt,
  }));
}

export async function upsertPresence(input: PresenceInput) {
  await ensurePresenceTable();
  await pruneExpiredSessions();

  const key = keyFor(input);
  const identity = identityFor(input);

  await db.$executeRawUnsafe(
    `
      INSERT INTO "LivePresenceSession" (
        "key",
        "identity",
        "visitorId",
        "tabId",
        "userId",
        "scope",
        "targetId",
        "activity",
        "lastSeenAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "identity" = EXCLUDED."identity",
        "visitorId" = EXCLUDED."visitorId",
        "tabId" = EXCLUDED."tabId",
        "userId" = EXCLUDED."userId",
        "scope" = EXCLUDED."scope",
        "targetId" = EXCLUDED."targetId",
        "activity" = EXCLUDED."activity",
        "lastSeenAt" = NOW()
    `,
    key,
    identity,
    input.visitorId,
    input.tabId,
    input.userId ?? null,
    input.scope,
    input.targetId ?? null,
    input.activity,
  );
}

export async function leavePresence(input: Pick<PresenceInput, "visitorId" | "tabId" | "userId">) {
  await ensurePresenceTable();
  await db.$executeRawUnsafe(
    `DELETE FROM "LivePresenceSession" WHERE "key" = $1`,
    keyFor(input),
  );
}

export async function getPresenceSnapshot(
  scope: PresenceScope,
  targetId?: string | null,
): Promise<PresenceSnapshot> {
  const rows = await readRows();
  const now = Date.now();
  const target = targetId ?? null;
  const onlineRows = rows.filter((row) => isFresh(row.lastSeenAt, ONLINE_TIMEOUT_MS, now));
  const unique = (filter: (row: PresenceRow) => boolean) =>
    new Set(onlineRows.filter(filter).map((row) => row.identity)).size;
  const scopedFilter = (row: PresenceRow) =>
    row.scope === scope && (target ? row.targetId === target : true);
  const postTargetFilter = (row: PresenceRow) =>
    row.scope === "post" && (!target || row.targetId === target);
  const typingFilter = (row: PresenceRow) =>
    postTargetFilter(row) &&
    row.activity === "commenting_post" &&
    isFresh(row.lastSeenAt, TYPING_TIMEOUT_MS, now);

  return {
    pulse: {
      usersOnline: unique(() => true),
      activeAuthors: unique((row) => row.activity === "creating_post"),
      activeReaders: unique((row) => row.scope === "post"),
      openPosts: new Set(
        onlineRows
          .filter((row) => row.scope === "post" && row.targetId)
          .map((row) => row.targetId),
      ).size,
    },
    current: {
      scope,
      targetId: target,
      online: unique(scopedFilter),
    },
    post:
      scope === "post"
        ? {
            readers: unique(
              (row) => postTargetFilter(row) && row.activity !== "commenting_post",
            ),
            commenters: unique(typingFilter),
          }
        : undefined,
    profile:
      scope === "profile"
        ? {
            viewers: unique((row) => row.scope === "profile" && (!target || row.targetId === target)),
          }
        : undefined,
    updatedAt: new Date(now).toISOString(),
  };
}

export async function getPresenceStats() {
  const rows = await readRows();

  return {
    sessions: rows.length,
    listeners: 0,
    maxSessions: null,
    maxListeners: null,
  };
}
