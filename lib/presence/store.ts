export type PresenceScope = "site" | "post" | "profile" | "create";

export type PresenceActivity =
  | "online"
  | "reading_post"
  | "viewing_profile"
  | "commenting_post"
  | "creating_post";

export interface PresenceSnapshot {
  pulse: {
    usersOnline: number;
    activeAuthors: number;
    activeReaders: number;
    openPosts: number;
  };
  current: {
    scope: PresenceScope;
    targetId: string | null;
    online: number;
  };
  post?: {
    readers: number;
    commenters: number;
  };
  profile?: {
    viewers: number;
  };
  updatedAt: string;
}

export interface PresenceInput {
  visitorId: string;
  tabId: string;
  userId?: string | null;
  scope: PresenceScope;
  targetId?: string | null;
  activity: PresenceActivity;
}

interface PresenceSession extends PresenceInput {
  identity: string;
  key: string;
  connectedAt: number;
  lastSeenAt: number;
}

type PresenceListener = () => void;

const PRESENCE_TIMEOUT_MS = 45_000;
const PRESENCE_MIN_UPDATE_MS = 2_500;
const PRESENCE_MAX_SESSIONS = 1_000;
const PRESENCE_MAX_TABS_PER_IDENTITY = 8;
const PRESENCE_MAX_LISTENERS = 400;
const MAX_ID_LENGTH = 120;

function sanitizeId(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:.-]/g, "")
    .slice(0, MAX_ID_LENGTH);
}

function normalizeScope(value: string | null | undefined): PresenceScope {
  if (value === "post" || value === "profile" || value === "create") {
    return value;
  }

  return "site";
}

function normalizeActivity(
  value: string | null | undefined,
  scope: PresenceScope,
): PresenceActivity {
  if (
    value === "online" ||
    value === "reading_post" ||
    value === "viewing_profile" ||
    value === "commenting_post" ||
    value === "creating_post"
  ) {
    return value;
  }

  if (scope === "post") return "reading_post";
  if (scope === "profile") return "viewing_profile";
  if (scope === "create") return "creating_post";

  return "online";
}

export function normalizePresenceInput(input: {
  visitorId?: string | null;
  tabId?: string | null;
  userId?: string | null;
  scope?: string | null;
  targetId?: string | null;
  activity?: string | null;
}): PresenceInput {
  const scope = normalizeScope(input.scope);
  const visitorId = sanitizeId(input.visitorId) || "anonymous";
  const tabId = sanitizeId(input.tabId) || visitorId;
  const userId = sanitizeId(input.userId);

  return {
    visitorId,
    tabId,
    userId: userId || null,
    scope,
    targetId: sanitizeId(input.targetId) || null,
    activity: normalizeActivity(input.activity, scope),
  };
}

class PresenceStore {
  private sessions = new Map<string, PresenceSession>();
  private listeners = new Set<PresenceListener>();

  upsert(input: PresenceInput) {
    const now = Date.now();
    this.prune(now);

    const identity = input.userId ? `user:${input.userId}` : `visitor:${input.visitorId}`;
    const key = `${identity}:${input.tabId}`;
    const existing = this.sessions.get(key);

    if (!existing) {
      const identitySessionCount = [...this.sessions.values()].filter(
        (session) => session.identity === identity,
      ).length;

      if (
        this.sessions.size >= PRESENCE_MAX_SESSIONS ||
        identitySessionCount >= PRESENCE_MAX_TABS_PER_IDENTITY
      ) {
        return false;
      }
    }

    if (
      existing &&
      existing.activity === input.activity &&
      existing.scope === input.scope &&
      existing.targetId === (input.targetId ?? null) &&
      now - existing.lastSeenAt < PRESENCE_MIN_UPDATE_MS
    ) {
      return true;
    }

    this.sessions.set(key, {
      ...input,
      targetId: input.targetId ?? null,
      userId: input.userId ?? null,
      identity,
      key,
      connectedAt: existing?.connectedAt ?? now,
      lastSeenAt: now,
    });
    this.broadcast();
    return true;
  }

  touch(input: PresenceInput) {
    const now = Date.now();
    this.prune(now);

    const identity = input.userId ? `user:${input.userId}` : `visitor:${input.visitorId}`;
    const key = `${identity}:${input.tabId}`;
    const existing = this.sessions.get(key);

    if (!existing) {
      this.upsert(input);
      return;
    }

    existing.lastSeenAt = now;
    this.sessions.set(key, existing);
  }

  leave(input: Pick<PresenceInput, "visitorId" | "tabId" | "userId">) {
    const visitorId = sanitizeId(input.visitorId) || "anonymous";
    const tabId = sanitizeId(input.tabId) || visitorId;
    const userId = sanitizeId(input.userId);
    const identity = userId ? `user:${userId}` : `visitor:${visitorId}`;
    const deleted = this.sessions.delete(`${identity}:${tabId}`);

    if (deleted) {
      this.broadcast();
    }
  }

  canSubscribe() {
    return this.listeners.size < PRESENCE_MAX_LISTENERS;
  }

  subscribe(listener: PresenceListener) {
    if (!this.canSubscribe()) {
      return null;
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  stats() {
    this.prune();

    return {
      sessions: this.sessions.size,
      listeners: this.listeners.size,
      maxSessions: PRESENCE_MAX_SESSIONS,
      maxListeners: PRESENCE_MAX_LISTENERS,
    };
  }

  snapshot(scope: PresenceScope, targetId?: string | null): PresenceSnapshot {
    const now = Date.now();
    this.prune(now);

    const sessions = [...this.sessions.values()].filter(
      (session) => now - session.lastSeenAt <= PRESENCE_TIMEOUT_MS,
    );
    const target = targetId ?? null;
    const unique = (filter: (session: PresenceSession) => boolean) =>
      new Set(sessions.filter(filter).map((session) => session.identity)).size;
    const scopedFilter = (session: PresenceSession) =>
      session.scope === scope && (target ? session.targetId === target : true);

    const postReaders = unique(
      (session) =>
        session.scope === "post" &&
        (!target || session.targetId === target) &&
        (session.activity === "reading_post" || session.activity === "commenting_post"),
    );
    const postCommenters = unique(
      (session) =>
        session.scope === "post" &&
        (!target || session.targetId === target) &&
        session.activity === "commenting_post",
    );
    const profileViewers = unique(
      (session) => session.scope === "profile" && (!target || session.targetId === target),
    );

    return {
      pulse: {
        usersOnline: unique(() => true),
        activeAuthors: unique(
          (session) => Boolean(session.userId) || session.activity === "creating_post",
        ),
        activeReaders: unique((session) => session.scope === "post"),
        openPosts: new Set(
          sessions
            .filter((session) => session.scope === "post" && session.targetId)
            .map((session) => session.targetId),
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
              readers: postReaders,
              commenters: postCommenters,
            }
          : undefined,
      profile:
        scope === "profile"
          ? {
              viewers: profileViewers,
            }
          : undefined,
      updatedAt: new Date(now).toISOString(),
    };
  }

  private prune(now = Date.now()) {
    let changed = false;

    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastSeenAt > PRESENCE_TIMEOUT_MS) {
        this.sessions.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.broadcast();
    }
  }

  private broadcast() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const globalForPresence = globalThis as unknown as {
  tkPresenceStore?: PresenceStore;
};

export const presenceStore = globalForPresence.tkPresenceStore ?? new PresenceStore();

if (process.env.NODE_ENV !== "production") {
  globalForPresence.tkPresenceStore = presenceStore;
}
