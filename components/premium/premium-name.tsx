import { Crown } from "lucide-react";
import type React from "react";

import { isPremiumActive, normalizePremiumNameEffect, type PremiumNameEffect } from "@/lib/premium";
import { cn } from "@/lib/utils";

export interface PremiumNameUser {
  premiumUntil?: Date | string | null;
  profile?: {
    premiumNameEffect?: string | null;
  } | null;
}

export function PremiumBadge({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary",
        className,
      )}
      title="Premium"
    >
      <Crown className="size-3" />
      Premium
    </span>
  );
}

export function PremiumName({
  user,
  children,
  className,
}: {
  user?: PremiumNameUser | null;
  children: React.ReactNode;
  className?: string;
}) {
  const premium = isPremiumActive(user);
  const effect: PremiumNameEffect = premium
    ? normalizePremiumNameEffect(user?.profile?.premiumNameEffect)
    : "none";

  return (
    <span
      className={cn(
        "inline min-w-0 break-words",
        premium && effect !== "none" && "premium-name",
        premium && effect !== "none" && `premium-name--${effect}`,
        className,
      )}
    >
      {children}
    </span>
  );
}
