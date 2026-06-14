import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Страница не найдена</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Проверьте адрес страницы или вернитесь в ленту.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Вернуться в ленту</Link>
        </Button>
      </div>
    </main>
  );
}
