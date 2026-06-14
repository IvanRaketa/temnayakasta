import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Профиль автора в Тёмной Касте.",
};

export default async function ProfilePage() {
  const current = await getCurrentSessionReadOnly();

  if (current) {
    redirect(`/profile/${current.user.username}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль автора</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Войдите, чтобы открыть свой профиль, публикации, подписки и настройки видимости.
        </p>
        <Button asChild>
          <Link href="/login">
            <LogIn className="size-4" />
            Войти
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
