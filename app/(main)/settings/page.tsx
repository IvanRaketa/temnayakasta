import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Mail, Shield, UserRound } from "lucide-react";

import { InterfaceSettings } from "@/components/settings/interface-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Настройки",
  description: "Настройки аккаунта, профиля, безопасности и интерфейса Темной Касты.",
};

const accountLinks = [
  {
    href: "/settings/profile",
    title: "Профиль и e-mail",
    description: "Отображаемое имя, аватар, bio, Premium-оформление и смена e-mail через код.",
    icon: UserRound,
  },
  {
    href: "/premium",
    title: "Premium",
    description: "Статус, отключение рекламы и визуальные возможности без оплаты на этом этапе.",
    icon: Crown,
  },
  {
    href: "/settings/security",
    title: "Безопасность",
    description: "Пароль, активные сессии, выход со всех устройств и деактивация.",
    icon: Shield,
  },
  {
    href: "/verify-email",
    title: "Подтверждение почты",
    description: "Повторная отправка кода и ввод шестизначного подтверждения.",
    icon: Mail,
  },
];

export default async function SettingsPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="tk-glass-strong tk-panel rounded-lg p-5 md:p-6">
        <p className="tk-kicker">Control room</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Настройки</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Аккаунт, безопасность и внешний вид сайта.
        </p>
      </div>

      <InterfaceSettings />

      <Card className="tk-glass-strong">
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {accountLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="tk-link-card flex min-h-40 flex-col justify-between p-4"
              >
                <span className="grid size-10 place-items-center rounded-md border border-border bg-background/35 text-primary">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">{item.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
