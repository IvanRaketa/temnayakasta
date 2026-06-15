import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ActiveAdvertisement } from "@/lib/ads/get-active-ad";
import { isExternalAdUrl, validateAdTargetUrl } from "@/lib/ads/url";
import { cn } from "@/lib/utils";

export function AdCard({ ad, compact = false }: { ad: ActiveAdvertisement; compact?: boolean }) {
  const target = validateAdTargetUrl(ad.targetUrl);
  if (!target.ok) return null;

  const isExternal = isExternalAdUrl(ad.targetUrl);
  const clickUrl = `/api/ads/${encodeURIComponent(ad.id)}/click`;

  return (
    <section
      aria-label="Реклама"
      className={cn(
        "tk-glass overflow-hidden rounded-2xl border border-primary/20 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition hover:border-primary/40",
        compact ? "text-sm" : "text-base",
      )}
    >
      <a
        href={clickUrl}
        target={isExternal ? "_blank" : undefined}
        rel="sponsored noopener noreferrer"
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ad.imageUrl ? (
          <div
            className={cn(
              "overflow-hidden bg-secondary/40",
              compact ? "aspect-[4/3]" : "aspect-[16/9]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt=""
              className="size-full object-cover transition duration-300 hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}
        <div className={cn("space-y-3", compact ? "p-3" : "p-4 md:p-5")}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Реклама</Badge>
            {isExternal ? <ExternalLink className="size-3.5 text-muted-foreground" /> : null}
          </div>
          <div className="space-y-1.5">
            <h2
              className={cn(
                "break-words font-semibold leading-tight text-foreground",
                compact ? "text-sm" : "text-lg",
              )}
            >
              {ad.title}
            </h2>
            {ad.description ? (
              <p className="break-words text-sm leading-6 text-muted-foreground">
                {ad.description}
              </p>
            ) : null}
          </div>
          {ad.advertiserName || ad.erid ? (
            <div className="space-y-1 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground">
              {ad.advertiserName ? (
                <p className="break-words">Рекламодатель: {ad.advertiserName}</p>
              ) : null}
              {ad.erid ? <p className="break-all">erid: {ad.erid}</p> : null}
            </div>
          ) : null}
        </div>
      </a>
    </section>
  );
}
