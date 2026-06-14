"use client";

import { useEffect } from "react";

interface PostInterestTrackerProps {
  postId: string;
  enabled: boolean;
}

function sendDwellEvent(postId: string, activeSeconds: number) {
  const payload = JSON.stringify({ postId, activeSeconds });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/interest-events",
      new Blob([payload], { type: "application/json" }),
    );

    if (sent) {
      return;
    }
  }

  fetch("/api/interest-events", {
    method: "POST",
    body: payload,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}

export function PostInterestTracker({ postId, enabled }: PostInterestTrackerProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let activeStartedAt: number | null = document.visibilityState === "visible" ? Date.now() : null;
    let activeMs = 0;
    let sent = false;
    const mountedAt = Date.now();

    const collectActiveTime = () => {
      if (activeStartedAt === null) {
        return;
      }

      activeMs += Date.now() - activeStartedAt;
      activeStartedAt = document.visibilityState === "visible" ? Date.now() : null;
    };

    const send = () => {
      if (sent) {
        return;
      }

      collectActiveTime();
      sent = true;

      const activeSeconds = Math.round(activeMs / 1000);
      if (activeSeconds > 0) {
        sendDwellEvent(postId, activeSeconds);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        collectActiveTime();
        return;
      }

      if (activeStartedAt === null) {
        activeStartedAt = Date.now();
      }
    };

    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (Date.now() - mountedAt > 1000) {
        send();
      }

      window.removeEventListener("pagehide", send);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, postId]);

  return null;
}
