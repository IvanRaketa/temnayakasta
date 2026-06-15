import type { Metadata } from "next";
import "./globals.css";
import "../styles/rounding.css";

import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: {
    default: projectConfig.name,
    template: `%s | ${projectConfig.name}`,
  },
  description: `${projectConfig.name} — ${projectConfig.description}`,
  applicationName: projectConfig.name,
  metadataBase: new URL(projectConfig.url),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: projectConfig.name,
    description: projectConfig.description,
    siteName: projectConfig.name,
    url: projectConfig.url,
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: projectConfig.name,
    description: projectConfig.description,
  },
  manifest: "/manifest.webmanifest",
};

const themeScript = `
(() => {
  try {
    const theme = localStorage.getItem("temnaya-kasta:theme") || "dark";
    const compact = localStorage.getItem("temnaya-kasta:compact") === "true";
    const reduceMotion = localStorage.getItem("temnaya-kasta:reduce-motion") === "true"
      || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resolvedTheme = theme === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : theme;
    document.documentElement.classList.toggle("light", resolvedTheme === "light");
    document.documentElement.classList.toggle("dark", resolvedTheme !== "light");
    document.documentElement.classList.toggle("compact", compact);
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  } catch {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
