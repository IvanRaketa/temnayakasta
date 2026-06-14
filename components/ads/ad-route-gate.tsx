"use client";

import { usePathname } from "next/navigation";

const blockedAdPrefixes = [
  "/admin",
  "/moderation",
  "/settings",
  "/privacy",
  "/terms",
  "/legal",
  "/contacts",
  "/consent",
  "/email-consent",
  "/personal-data",
  "/personal-data-distribution-consent",
  "/personal-data-operator",
  "/community-rules",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
];

function isBlockedAdPath(pathname: string) {
  return blockedAdPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AdRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isBlockedAdPath(pathname)) return null;

  return children;
}
