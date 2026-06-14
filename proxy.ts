import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  const isLocalhost =
    host?.startsWith("localhost") ||
    host?.startsWith("127.0.0.1") ||
    host?.startsWith("192.168.") ||
    host?.startsWith("10.") ||
    host?.startsWith("172.");

  if (proto === "http" && host && !isLocalhost) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};