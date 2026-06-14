import type { MetadataRoute } from "next";

import { projectConfig } from "@/lib/project";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/create", "/moderation", "/notifications", "/settings"],
      },
    ],
    sitemap: `${projectConfig.url}/sitemap.xml`,
    host: projectConfig.url,
  };
}
