import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Crown, Palette, Sparkles, ToggleLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { PREMIUM_NAME_EFFECTS, isPremiumActive } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Premium",
  description: "Premium-возможности Тёмной Касты.",
};

const features = [
  {
    title: "Отключение рекламы",
    description: "Рекламные блоки скрываются для активного Premium.",
    icon: ToggleLeft,
  },
  {
    title: "Premium-значок",
    description: "Значок появляется рядом с именем в профиле, постах и комментариях.",
    icon: BadgeCheck,
  },
  {
    title: "Переливающееся имя",
    description: `Доступны варианты: ${PREMIUM_NAME_EFFECTS.filter(
      (effect) => effect.value !== "none",
    )
      .map((effect) => effect.label)
      .join(", ")}.`,
    icon: Sparkles,
  },
  {
    title: "Настройка профиля",
    description: "Выбор эффекта находится в настройках профиля.",
    icon: Palette,
  },
];

function formatDate(date?: Date | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function PremiumPage() {
  const current = await getCurrentSessionReadOnly();
  const premiumActive = isPremiumActive(current?.user);

  return (
    <div className="space-y-5">
      <Card className="tk-glass-strong tk-premium-border">
        <CardHeader>
          <p className="tk-kicker">Возможности</p>
          <CardTitle className="mt-3 flex items-center gap-2 text-3xl">
            <Crown className="size-5 text-primary" />
            Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Premium усиливает профиль и убирает рекламные блоки. Сейчас статус выдаётся внутри
            сайта, публичная покупка недоступна.
          </p>
          {current ? (
            <div className="tk-glass rounded-md p-3 text-sm">
              <p className="font-medium text-foreground">
                Ваш статус: {premiumActive ? "Premium активен" : "обычный аккаунт"}
              </p>
              {premiumActive ? (
                <p className="mt-1 text-muted-foreground">
                  Действует до {formatDate(current.user.premiumUntil) ?? "не указанной даты"}.
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  Premium-статус можно получить через администрацию сайта.
                </p>
              )}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled>Недоступно</Button>
            <Button asChild variant="secondary">
              <Link href="/settings/profile">Настроить профиль</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="tk-hover-lift">
            <CardContent className="space-y-3 p-4">
              <span className="grid size-10 place-items-center rounded-md border border-border bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </span>
              <h2 className="break-words text-sm font-semibold text-foreground">{feature.title}</h2>
              <p className="break-words text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
