"use client";

import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { NavLink, type NavIconName } from "@/components/layout/nav-link";
import { cn } from "@/lib/utils";

type MobileItem = {
  href: string;
  label: string;
  iconName: NavIconName;
  exact?: boolean;
};

const mainItems: MobileItem[] = [
  { href: "/", label: "Главная", iconName: "home", exact: true },
  { href: "/new", label: "Новое", iconName: "sparkles", exact: true },
  { href: "/create", label: "Создать", iconName: "squarePen", exact: true },
  { href: "/profile", label: "Профиль", iconName: "user", exact: false },
];

const baseMoreItems: MobileItem[] = [
  { href: "/popular", label: "Популярное", iconName: "newspaper", exact: true },
  { href: "/feed/following", label: "Подписки", iconName: "newspaper" },
  { href: "/premium", label: "Premium", iconName: "crown", exact: true },
  { href: "/settings", label: "Настройки", iconName: "settings", exact: true },
];

export function MobileNav({ showAdmin = false, showModeration = false }: { showAdmin?: boolean; showModeration?: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const moreItems = useMemo(() => {
    const roleItems: MobileItem[] = [];

    if (showAdmin) {
      roleItems.push({ href: "/admin", label: "Admin", iconName: "shield", exact: true });
    }

    if (showModeration) {
      roleItems.push({ href: "/moderation", label: "Модерация", iconName: "shield" });
    }

    return [...baseMoreItems, ...roleItems];
  }, [showAdmin, showModeration]);

  const moreActive = moreItems.some((item) =>
    item.href === "/" || item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <>
      {isOpen ? (
        <div className="tk-glass-strong fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 rounded-lg p-3 shadow-2xl md:hidden">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-semibold text-foreground">Разделы</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground"
              aria-label="Закрыть меню"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-1">
            {moreItems.map((item) => (
              <div key={item.href} onClick={() => setIsOpen(false)}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  iconName={item.iconName}
                  exact={item.exact}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/75 bg-background/82 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
        {mainItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            iconName={item.iconName}
            exact={item.exact}
            mobile
          />
        ))}
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className={cn(
            "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-[background-color,color,box-shadow,transform] hover:bg-secondary/80 hover:text-foreground active:scale-[0.98]",
            (isOpen || moreActive) &&
              "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_rgba(246,205,96,0.18),0_0_18px_rgba(246,205,96,0.1)]",
          )}
          aria-expanded={isOpen}
          aria-label="Открыть остальные разделы"
        >
          <span className="relative">
            <Menu className="size-4" />
          </span>
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
}
