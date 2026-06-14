"use client";

import { useEffect, useRef } from "react";

export function AdImpressionTracker({
  adId,
  children,
}: {
  adId: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !adId || !("IntersectionObserver" in window)) return;

    const storageKey = `temnaya-kasta:ad-impression:${adId}`;

    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      return;
    }

    let sent = false;
    const sendImpression = () => {
      if (sent) return;
      sent = true;

      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        return;
      }

      fetch(`/api/ads/${encodeURIComponent(adId)}/impression`, {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      }).catch(() => {});
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25)) {
          sendImpression();
          observer.disconnect();
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, [adId]);

  return <div ref={rootRef}>{children}</div>;
}
