"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const LIVE_REFRESH_INTERVAL_MS = 6_000;

function shouldRefreshPath(pathname: string | null) {
  if (!pathname) return false;

  return pathname === "/" || pathname.startsWith("/post/");
}

function isUserTyping() {
  const active = document.activeElement;

  if (!active) return false;

  const tagName = active.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    active.getAttribute("contenteditable") === "true"
  );
}

export function LivePageRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!shouldRefreshPath(pathname)) return;

    const refresh = () => {
      if (document.visibilityState !== "visible" || isUserTyping()) {
        return;
      }

      router.refresh();
    };

    const interval = window.setInterval(refresh, LIVE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [pathname, router]);

  return null;
}
