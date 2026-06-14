import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  deleteAccountAction,
  logoutAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/app/(main)/settings/security/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Безопасность",
  description: "Активные устройства, сессии и удаление аккаунта Тёмной Касты.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string; passwordChanged?: string; passwordError?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    redirect("/login");
  }

  const sessions = await db.userSession.findMany({
    where: {
      userId: current.user.id,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card className="tk-glass-strong">
        <CardHeader>
          <p className="tk-kicker">Security vault</p>
          <CardTitle className="mt-3 text-2xl">Безопасность</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Управление активными устройствами, сессиями и удалением аккаунта.
          </p>
          <form action={logoutAction}>
            <Button variant="secondary">Выйти из текущей сессии</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Активные устройства</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="tk-glass rounded-md p-4 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="font-medium text-foreground">
                    {session.id === current.session.id ? "Текущая сессия" : "Активная сессия"}
                  </p>
                  <p className="break-words text-muted-foreground">IP: {session.ip}</p>
                  <p className="break-words text-muted-foreground">
                    User-Agent: {session.userAgent ?? "unknown"}
                  </p>
                  <p className="text-muted-foreground">
                    Последняя активность: {formatDate(session.lastSeenAt)}
                  </p>
                </div>
                {session.id !== current.session.id ? (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <Button variant="secondary">Завершить</Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
          <form action={revokeOtherSessionsAction}>
            <Button variant="secondary">Завершить все остальные сессии</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Удаление аккаунта</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="tk-glass mb-6 space-y-4 rounded-md p-4">
            <h3 className="text-base font-semibold text-foreground">Смена пароля</h3>
            {params.passwordChanged === "1" ? (
              <p className="text-sm text-accent">Пароль изменён.</p>
            ) : null}
            {params.passwordError === "current" ? (
              <p className="text-sm text-destructive">Старый пароль указан неверно.</p>
            ) : null}
            {params.passwordError === "rate" ? (
              <p className="text-sm text-destructive">Слишком много попыток. Попробуйте позже.</p>
            ) : null}
            {params.passwordError === "length" ? (
              <p className="text-sm text-destructive">
                Новый пароль должен быть не короче 8 символов.
              </p>
            ) : null}
            {params.passwordError === "tooLong" ? (
              <p className="text-sm text-destructive">Новый пароль слишком длинный.</p>
            ) : null}
            {params.passwordError === "match" ? (
              <p className="text-sm text-destructive">Новые пароли не совпадают.</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                name="currentPassword"
                type="password"
                placeholder="Старый пароль"
                autoComplete="current-password"
                required
              />
              <Input
                name="newPassword"
                type="password"
                placeholder="Новый пароль"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <Input
                name="newPasswordConfirmation"
                type="password"
                placeholder="Повторите новый пароль"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input name="revokeOthers" type="checkbox" className="size-4 accent-primary" />
              Завершить остальные сессии
            </label>
            <Button type="submit" variant="secondary">
              Изменить пароль
            </Button>
          </form>

          <form action={deleteAccountAction} className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Аккаунт будет деактивирован через soft delete: профиль скрывается, вход запрещается,
              активные сессии завершаются. Данные не удаляются физически сразу.
            </p>
            {params.deleteError === "password" ? (
              <p className="text-sm text-destructive">Пароль указан неверно.</p>
            ) : null}
            {params.deleteError === "rate" ? (
              <p className="text-sm text-destructive">Слишком много попыток. Попробуйте позже.</p>
            ) : null}
            {params.deleteError === "confirmation" ? (
              <p className="text-sm text-destructive">Введите УДАЛИТЬ для подтверждения.</p>
            ) : null}
            <Input
              name="password"
              type="password"
              placeholder="Пароль"
              autoComplete="current-password"
            />
            <Input name="confirmation" placeholder="Введите УДАЛИТЬ" />
            <Button variant="secondary">Деактивировать аккаунт</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
