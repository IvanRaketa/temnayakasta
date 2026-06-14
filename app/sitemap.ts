import type { MetadataRoute } from "next";

import { projectConfig } from "@/lib/project";

type SitemapEntry = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

const routes: SitemapEntry[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/new", priority: 0.86, changeFrequency: "daily" },
  { path: "/popular", priority: 0.82, changeFrequency: "daily" },
  { path: "/search", priority: 0.74, changeFrequency: "weekly" },
  { path: "/premium", priority: 0.64, changeFrequency: "monthly" },
  { path: "/help", priority: 0.58, changeFrequency: "monthly" },
  { path: "/sitemap", priority: 0.55, changeFrequency: "monthly" },
  { path: "/legal", priority: 0.52, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.46, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.46, changeFrequency: "yearly" },
  { path: "/community-rules", priority: 0.46, changeFrequency: "yearly" },
  { path: "/personal-data", priority: 0.42, changeFrequency: "yearly" },
  { path: "/consent", priority: 0.42, changeFrequency: "yearly" },
  { path: "/personal-data-distribution-consent", priority: 0.42, changeFrequency: "yearly" },
  { path: "/email-consent", priority: 0.42, changeFrequency: "yearly" },
  { path: "/personal-data-operator", priority: 0.42, changeFrequency: "yearly" },
  { path: "/contacts", priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: new URL(route.path, projectConfig.url).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
