import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, Flag, Shield, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Помощь",
  description: "Справочная страница Тёмной Касты.",
};

const helpItems = [
  {
    title: "Профиль",
    description:
      "Аватар, отображаемое имя, bio, e-mail и Premium-оформление находятся в настройках профиля.",
    href: "/settings/profile",
    icon: UserRound,
  },
  {
    title: "Безопасность",
    description: "Пароль, сессии и деактивация аккаунта находятся в настройках безопасности.",
    href: "/settings/security",
    icon: Shield,
  },
  {
    title: "Жалобы",
    description: "Жалобу можно отправить из профиля пользователя, поста или комментария.",
    href: "/legal",
    icon: Flag,
  },
  {
    title: "Правовая информация",
    description:
      "Условия, приватность, персональные данные, согласия и контакты собраны в одном разделе.",
    href: "/legal",
    icon: CircleHelp,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Помощь</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Основные действия доступны из ленты, профиля и настроек. Если нужна связь с владельцем
            сайта, используйте страницу контактов.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2">
        {helpItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              className="flex min-h-32 gap-3 rounded-md border border-border bg-card p-4 transition hover:border-ring hover:bg-secondary/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
