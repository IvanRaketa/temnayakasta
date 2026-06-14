import { createHash } from "node:crypto";

import { getClientIp } from "@/lib/request/get-client-ip";

type AdMetricKind = "click" | "impression";

const METRIC_WINDOWS_MS: Record<AdMetricKind, number> = {
  click: 5 * 60 * 1000,
  impression: 30 * 60 * 1000,
};

const globalForAdMetrics = globalThis as unknown as {
  tkAdMetricDedupe?: Map<string, number>;
};

const adMetricDedupe = globalForAdMetrics.tkAdMetricDedupe ?? new Map<string, number>();

if (process.env.NODE_ENV !== "production") {
  globalForAdMetrics.tkAdMetricDedupe = adMetricDedupe;
}

function pruneExpired(now: number) {
  for (const [key, expiresAt] of adMetricDedupe.entries()) {
    if (expiresAt <= now) {
      adMetricDedupe.delete(key);
    }
  }
}

export function shouldCountAdMetric(kind: AdMetricKind, adId: string, headers: Headers) {
  const now = Date.now();
  pruneExpired(now);

  const ip = getClientIp(headers);
  const userAgent = headers.get("user-agent")?.slice(0, 240) ?? "unknown";
  const identity = createHash("sha256")
    .update(`${kind}:${adId}:${ip}:${userAgent}`)
    .digest("base64url");

  if (adMetricDedupe.has(identity)) {
    return false;
  }

  adMetricDedupe.set(identity, now + METRIC_WINDOWS_MS[kind]);
  return true;
}
