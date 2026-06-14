import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const enableHsts = process.env.ENABLE_HSTS === "true";

const scriptSrc = ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])];
const connectSrc = ["'self'", ...(isProduction ? [] : ["ws:", "wss:"])];
const authPageSources = ["/login", "/register", "/forgot-password", "/verify-email"];
const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];
const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    const headers = [
      {
        key: "Content-Security-Policy",
        value: csp,
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    ];

    if (enableHsts) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=15552000; includeSubDomains",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
      ...authPageSources.map((source) => ({
        source,
        headers: noStoreHeaders,
      })),
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
