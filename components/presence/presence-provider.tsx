"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PresenceActivity, PresenceScope, PresenceSnapshot } from "@/lib/presence/store";

const VISITOR_STORAGE_KEY = "temnaya-kasta:presence-visitor";
const TEMPORARY_ACTIVITY_MS = 3_000;
const PRESENCE_POLL_MS = 4_000;

interface PresenceContextValue {
  snapshot: PresenceSnapshot | null;
  setActivity: (activity: PresenceActivity) => void;
  setTemporaryActivity: (activity: PresenceActivity, durationMs?: number) => void;
  resetActivity: () => void;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);

    if (existing) {
      return existing;
    }

    const created = createId();
    window.localStorage.setItem(VISITOR_STORAGE_KEY, created);

    return created;
  } catch {
    return createId();
  }
}

function presencePayload(input: {
  visitorId: string;
  tabId: string;
  scope: PresenceScope;
  targetId?: string | null;
  activity: PresenceActivity;
  action?: "leave";
}) {
  return {
    visitorId: input.visitorId,
    tabId: input.tabId,
    scope: input.scope,
    targetId: input.targetId ?? null,
    activity: input.activity,
    action: input.action,
  };
}

export function PresenceProvider({
  scope,
  targetId = null,
  initialActivity,
  children,
}: {
  scope: PresenceScope;
  targetId?: string | null;
  initialActivity: PresenceActivity;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<PresenceSnapshot | null>(null);
  const idsRef = useRef<{ visitorId: string; tabId: string } | null>(null);
  const activityRef = useRef<PresenceActivity>(initialActivity);
  const temporaryTimerRef = useRef<number | null>(null);

  const postActivity = useCallback(
    (activity: PresenceActivity, action?: "leave") => {
      const ids = idsRef.current;
      if (!ids) return;

      const body = JSON.stringify(
        presencePayload({
          ...ids,
          scope,
          targetId,
          activity,
          action,
        }),
      );

      if (action === "leave" && "sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/presence",
          new Blob([body], {
            type: "application/json",
          }),
        );
        return;
      }

      void fetch("/api/presence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        keepalive: action === "leave",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((nextSnapshot: PresenceSnapshot | null) => {
          if (nextSnapshot) {
            setSnapshot(nextSnapshot);
          }
        })
        .catch(() => undefined);
    },
    [scope, targetId],
  );

  const setActivity = useCallback(
    (activity: PresenceActivity) => {
      activityRef.current = activity;
      postActivity(activity);
    },
    [postActivity],
  );

  const resetActivity = useCallback(() => {
    if (temporaryTimerRef.current) {
      window.clearTimeout(temporaryTimerRef.current);
      temporaryTimerRef.current = null;
    }

    setActivity(initialActivity);
  }, [initialActivity, setActivity]);

  const setTemporaryActivity = useCallback(
    (activity: PresenceActivity, durationMs = TEMPORARY_ACTIVITY_MS) => {
      if (temporaryTimerRef.current) {
        window.clearTimeout(temporaryTimerRef.current);
      }

      setActivity(activity);
      temporaryTimerRef.current = window.setTimeout(() => {
        setActivity(initialActivity);
        temporaryTimerRef.current = null;
      }, durationMs);
    },
    [initialActivity, setActivity],
  );

  useEffect(() => {
    const visitorId = getVisitorId();
    const tabId = createId();
    idsRef.current = { visitorId, tabId };
    activityRef.current = initialActivity;

    const leave = () => {
      postActivity(activityRef.current, "leave");
    };
    const syncPresence = () => {
      if (document.visibilityState !== "visible") return;

      postActivity(activityRef.current);
    };
    const syncOnVisibility = () => {
      if (document.visibilityState === "visible") {
        syncPresence();
      } else {
        leave();
      }
    };

    syncPresence();
    window.addEventListener("pagehide", leave);
    window.addEventListener("beforeunload", leave);
    window.addEventListener("focus", syncPresence);
    document.addEventListener("visibilitychange", syncOnVisibility);

    const poll = window.setInterval(syncPresence, PRESENCE_POLL_MS);

    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("focus", syncPresence);
      document.removeEventListener("visibilitychange", syncOnVisibility);
      window.clearInterval(poll);

      if (temporaryTimerRef.current) {
        window.clearTimeout(temporaryTimerRef.current);
        temporaryTimerRef.current = null;
      }

      leave();
      idsRef.current = null;
    };
  }, [initialActivity, postActivity, scope, targetId]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      snapshot,
      setActivity,
      setTemporaryActivity,
      resetActivity,
    }),
    [resetActivity, setActivity, setTemporaryActivity, snapshot],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}

export function usePresenceActivity() {
  const context = usePresence();
  const setTemporaryActivity = context?.setTemporaryActivity;
  const resetActivity = context?.resetActivity;
  const setActivity = context?.setActivity;

  return useMemo(
    () => ({
      setTemporaryActivity: setTemporaryActivity ?? (() => undefined),
      resetActivity: resetActivity ?? (() => undefined),
      setActivity: setActivity ?? (() => undefined),
    }),
    [resetActivity, setActivity, setTemporaryActivity],
  );
}
