import Link from "next/link";
import { Bell, Castle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TopNav({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1380px] items-center gap-3 px-4 md:h-14 md:gap-2.5 md:px-5">
        <Link
          href="/"
          className="group flex min-w-fit items-center gap-3 md:gap-2.5"
          aria-label="Тёмная Каста"
        >
          <span className="grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_22px_rgba(246,205,96,0.16)] transition group-hover:border-primary/70 md:size-8 md:shadow-[0_0_18px_rgba(246,205,96,0.14)]">
            <Castle className="size-5 md:size-4" />
          </span>
          <span className="hidden text-base font-semibold leading-none text-foreground sm:inline md:text-sm">
            Тёмная Каста
          </span>
        </Link>
        <Link
          href="/search"
          className="relative hidden h-9 flex-1 items-center rounded-xl border border-input bg-background/55 pl-8 pr-3 text-xs text-muted-foreground backdrop-blur transition hover:border-ring hover:bg-secondary/50 hover:text-foreground md:flex"
        >
          <Search className="absolute left-3 size-3.5 text-muted-foreground" />
          Поиск по публикациям и авторам
        </Link>
        <Button
          asChild
          variant="secondary"
          size="icon"
          className="ml-auto md:size-9"
          aria-label="Уведомления"
        >
          <Link href="/notifications" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>
      </div>
    </header>
  );
}
