"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const LIVE_REFRESH_INTERVAL_MS = 3_000;
const LIVE_REFRESH_PATH_PREFIXES = [
  "/post/",
  "/new",
  "/popular",
  "/feed/",
  "/tag/",
  "/profile/",
  "/search",
];

function shouldRefreshPath(pathname: string | null) {
  if (!pathname) return false;

  return pathname === "/" || LIVE_REFRESH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
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
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);

  return null;
}
