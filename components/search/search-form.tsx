"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        startTransition(() => router.push(`/search?${params.toString()}`));
      }}
    >
      <input
        value={query}
        maxLength={80}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Посты, авторы, теги"
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button disabled={pending} className="w-full sm:w-auto">
        <Search className="size-4" />
        {pending ? "Ищу..." : "Найти"}
      </Button>
    </form>
  );
}
