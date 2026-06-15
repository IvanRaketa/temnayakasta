import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

function SiteLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 7c-8.2 3.4-14.4 10.1-18.4 19.7 2.1 10.9 8.3 19.3 18.4 25.3 10.1-6 16.3-14.4 18.4-25.3C46.4 17.1 40.2 10.4 32 7Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M32 7c-8.2 3.4-14.4 10.1-18.4 19.7 2.1 10.9 8.3 19.3 18.4 25.3 10.1-6 16.3-14.4 18.4-25.3C46.4 17.1 40.2 10.4 32 7Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 45.2 7.5 52l15.7-3.2M47.5 45.2 56.5 52l-15.7-3.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.2 33.2c4.2-1.7 7.6-1.4 10.2.9-4.8 2-8.3 1.7-10.2-.9Zm21.6 0c-4.2-1.7-7.6-1.4-10.2.9 4.8 2 8.3 1.7 10.2-.9Z"
        fill="currentColor"
      />
      <path d="M32 47.2 35.4 52 32 56.8 28.6 52 32 47.2Z" fill="currentColor" />
    </svg>
  );
}

export function TopNav({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link
          href="/"
          className="group flex min-w-fit items-center gap-3"
          aria-label="Тёмная Каста"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shadow-[0_0_18px_rgba(246,205,96,0.12)] transition group-hover:bg-primary/15">
            <SiteLogoMark className="size-7" />
          </span>
          <span className="hidden text-base font-semibold leading-none text-foreground sm:inline">
            Тёмная Каста
          </span>
        </Link>
        <Link
          href="/search"
          className="relative hidden h-10 flex-1 items-center rounded-xl border border-input bg-background/55 pl-9 pr-3 text-sm text-muted-foreground backdrop-blur transition hover:border-ring hover:bg-secondary/50 hover:text-foreground md:flex"
        >
          <Search className="absolute left-3 size-4 text-muted-foreground" />
          Поиск по публикациям и авторам
        </Link>
        <Button
          asChild
          variant="secondary"
          size="icon"
          className="ml-auto"
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
