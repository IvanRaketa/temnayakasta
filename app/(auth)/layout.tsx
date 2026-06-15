import Link from "next/link";
import { Castle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="tk-shell-surface flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg tk-fade-in">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit flex-col items-center gap-3 text-center text-foreground"
        >
          <span className="grid size-12 place-items-center rounded-2xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_28px_rgba(246,205,96,0.16)]">
            <Castle className="size-6" />
          </span>
          <span>
            <span className="block text-2xl font-semibold leading-tight">Тёмная Каста</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              социальная сеть
            </span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
