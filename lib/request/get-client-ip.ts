import { isIP } from "node:net";

type HeaderValue = string | string[] | undefined | null;

type HeaderSource =
  | Headers
  | {
      get(name: string): string | null;
    }
  | Record<string, HeaderValue>;

function readHeader(headers: HeaderSource, name: string): string | null {
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name);
  }

  const record = headers as Record<string, HeaderValue>;
  const value = record[name] ?? record[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeIp(value: string | null): string | null {
  const raw = value?.split(",")[0]?.trim();
  if (!raw) return null;
  if (isIP(raw)) return raw;

  const unwrapped = raw.startsWith("[") && raw.includes("]") ? raw.slice(1, raw.indexOf("]")) : raw;
  if (isIP(unwrapped)) return unwrapped;

  const ipv4WithPort = unwrapped.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  const withoutPort = ipv4WithPort?.[1] ?? unwrapped;

  return isIP(withoutPort) ? withoutPort : null;
}

export function isTrustedProxyEnabled() {
  return process.env.TRUST_PROXY === "true";
}

export function getRequestHost(headers: HeaderSource): string | null {
  const directHost = readHeader(headers, "host");

  if (!isTrustedProxyEnabled()) {
    return directHost;
  }

  return readHeader(headers, "x-forwarded-host") ?? directHost;
}

export function getClientIp(headers: HeaderSource): string {
  if (!isTrustedProxyEnabled()) {
    return "direct";
  }

  return (
    normalizeIp(readHeader(headers, "cf-connecting-ip")) ??
    normalizeIp(readHeader(headers, "x-forwarded-for")) ??
    normalizeIp(readHeader(headers, "x-real-ip")) ??
    "unknown"
  );
}
