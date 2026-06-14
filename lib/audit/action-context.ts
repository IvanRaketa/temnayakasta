import { getClientIp, getRequestHost } from "@/lib/request/get-client-ip";

export interface AuditActionContext {
  ip: string;
  userAgent?: string;
  route?: string;
  method?: string;
}

export function createAuditActionContext(
  headers: Headers,
  route?: string,
  method?: string,
): AuditActionContext {
  if (method && method !== "GET" && method !== "HEAD") {
    const origin = headers.get("origin");
    const host = getRequestHost(headers);

    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        throw new Error("CSRF_ORIGIN_MISMATCH");
      }
    }
  }

  return {
    ip: getClientIp(headers),
    userAgent: headers.get("user-agent") ?? undefined,
    route,
    method,
  };
}
