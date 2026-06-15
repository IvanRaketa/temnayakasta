import type React from "react";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { canModerate, isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";

async function readShellSession() {
  try {
    return await getCurrentSessionReadOnly();
  } catch (error) {
    console.error("Shell session lookup failed.", error);
    return null;
  }
}

async function readUnreadCount(userId?: string) {
  if (!userId) return 0;

  try {
    return await db.notification.count({ where: { userId, isRead: false } });
  } catch (error) {
    console.error("Unread notification count lookup failed.", error);
    return 0;
  }
}

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await readShellSession();
  const currentUser = current?.user ?? null;
  const unreadCount = await readUnreadCount(current?.user.id);

  return (
    <div className="tk-shell-surface min-h-screen bg-background">
      <TopNav unreadCount={unreadCount} />
      {current && !current.user.emailVerified ? (
        <div className="border-b border-primary/30 bg-primary/15 px-4 py-2.5 text-sm text-foreground backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">Подтвердите e-mail для полного доступа</span>
            <Link
              href={`/verify-email?email=${encodeURIComponent(current.user.email)}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Открыть подтверждение
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid w-full max-w-[1380px] grid-cols-1 px-4 pb-24 pt-3 md:grid-cols-[200px_minmax(0,1fr)] md:gap-4 md:px-5 md:pb-8 md:pt-4 xl:grid-cols-[196px_minmax(0,1fr)]">
        <Sidebar currentUser={currentUser} />
        <main className="min-w-0">{children}</main>
      </div>
      <Footer />
      <MobileNav showAdmin={isAdmin(currentUser)} showModeration={canModerate(currentUser)} />
    </div>
  );
}
