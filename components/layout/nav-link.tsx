"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleQuestionMark,
  Crown,
  House,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquarePen,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const icons = {
  bell: Bell,
  crown: Crown,
  help: CircleQuestionMark,
  home: House,
  newspaper: Newspaper,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  sparkles: Sparkles,
  squarePen: SquarePen,
  user: UserRound,
};

export type NavIconName = keyof typeof icons;

interface NavLinkProps {
  href: string;
  label: string;
  iconName: NavIconName;
  exact?: boolean;
  mobile?: boolean;
  badge?: number;
}

export function NavLink({
  href,
  label,
  iconName,
  exact = false,
  mobile = false,
  badge = 0,
}: NavLinkProps) {
  const pathname = usePathname();
  const active =
    href === "/" || exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = icons[iconName];

  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs text-muted-foreground transition-[background-color,color,box-shadow,transform] hover:bg-secondary/80 hover:text-foreground active:scale-[0.98]",
          active &&
            "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_rgba(246,205,96,0.18),0_0_18px_rgba(246,205,96,0.1)]",
        )}
      >
        <span className="relative">
          <Icon className={cn("size-4", active && "text-primary")} />
          {badge > 0 ? (
            <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow,transform] hover:bg-secondary/65 hover:text-foreground",
        active &&
          "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_rgba(246,205,96,0.16),0_0_22px_rgba(126,231,255,0.08)]",
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg border border-transparent transition",
          active ? "border-primary/35 bg-primary/10 text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      {label}
      {badge > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
