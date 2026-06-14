"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Camera, Crown, LockKeyhole, MailCheck, Send, Save } from "lucide-react";

import { initialState } from "@/app/(auth)/form-state";
import {
  confirmEmailChangeAction,
  requestEmailChangeAction,
  updateProfileAction,
} from "@/app/(main)/settings/profile/actions";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { PREMIUM_NAME_EFFECTS, normalizePremiumNameEffect } from "@/lib/premium";
import { cn } from "@/lib/utils";

interface ProfileSettingsFormProps {
  user: {
    username: string;
    email: string;
    avatar?: string | null;
    bio?: string | null;
    profile?: {
      displayName?: string | null;
      avatar?: string | null;
      bio?: string | null;
      premiumNameEffect?: string | null;
    } | null;
    premiumActive: boolean;
    premiumUntilLabel?: string | null;
  };
}

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const [profileState, profileAction] = useActionState(updateProfileAction, initialState);
  const [emailRequestState, emailRequestAction] = useActionState(
    requestEmailChangeAction,
    initialState,
  );
  const [emailConfirmState, emailConfirmAction] = useActionState(
    confirmEmailChangeAction,
    initialState,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const avatar = preview ?? user.profile?.avatar ?? user.avatar ?? null;
  const [pendingEmail, setPendingEmail] = useState("");
  const [selectedEffect, setSelectedEffect] = useState(
    user.premiumActive ? normalizePremiumNameEffect(user.profile?.premiumNameEffect) : "none",
  );

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const initials = useMemo(() => user.username.slice(0, 2).toUpperCase(), [user.username]);
  const displayPreview = user.profile?.displayName || user.username;

  return (
    <div className="space-y-6">
      <Card className="tk-glass-strong">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="tk-avatar-ring grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-lg font-semibold text-secondary-foreground">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="size-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background/60 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-secondary sm:w-auto">
                <Camera className="size-4" />
                Выбрать аватар
                <input
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setPreview((oldPreview) => {
                      if (oldPreview?.startsWith("blob:")) URL.revokeObjectURL(oldPreview);
                      return URL.createObjectURL(file);
                    });
                  }}
                />
              </label>
            </div>
            <FormMessage state={profileState} field="avatar" />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="usernameDisplay">
                  Логин
                </label>
                <Input
                  id="usernameDisplay"
                  value={user.username}
                  readOnly
                  className="bg-secondary/40"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Логин используется в ссылке профиля и пока не меняется.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="displayName">
                  Отображаемое имя
                </label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={user.profile?.displayName ?? ""}
                  maxLength={50}
                />
                <FormMessage state={profileState} field="displayName" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="bio">
                Bio
              </label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.profile?.bio ?? user.bio ?? ""}
                maxLength={500}
                className="min-h-32"
              />
              <FormMessage state={profileState} field="bio" />
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Профиль, отображаемое имя, аватар и bio могут быть доступны другим пользователям и
              посетителям сайта.{" "}
              <Link
                href={LEGAL_DOCUMENTS.personalDataDistributionConsent.href}
                className="text-primary hover:underline"
              >
                Подробнее
              </Link>
              .
            </p>

            <div className="tk-glass rounded-lg p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Crown className="size-4 text-primary" />
                    Premium-оформление имени
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {user.premiumActive
                      ? `Premium активен${user.premiumUntilLabel ? ` до ${user.premiumUntilLabel}` : ""}.`
                      : "Выбор переливания доступен только Premium-пользователям."}
                  </p>
                </div>
                {!user.premiumActive ? (
                  <span className="tk-pill">
                    <LockKeyhole className="size-3.5" />
                    Закрыто
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Переливание имени</span>
                  <select
                    name="premiumNameEffect"
                    value={selectedEffect}
                    disabled={!user.premiumActive}
                    onChange={(event) =>
                      setSelectedEffect(normalizePremiumNameEffect(event.target.value))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {PREMIUM_NAME_EFFECTS.map((effect) => (
                      <option key={effect.value} value={effect.value}>
                        {effect.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="tk-link-card px-3 py-2">
                  <p className="text-xs text-muted-foreground">Предпросмотр</p>
                  <p
                    className={cn(
                      "mt-1 break-words text-lg font-semibold",
                      user.premiumActive && selectedEffect !== "none" && "premium-name",
                      user.premiumActive &&
                        selectedEffect !== "none" &&
                        `premium-name--${selectedEffect}`,
                    )}
                  >
                    {displayPreview}
                  </p>
                </div>
              </div>
              {!user.premiumActive ? (
                <input type="hidden" name="premiumNameEffect" value="none" />
              ) : null}
            </div>

            <div className="tk-pill max-w-full p-3 text-sm">
              Текущий e-mail: <span className="text-foreground">{user.email}</span>
            </div>
            <FormMessage state={profileState} />
            <SubmitButton>
              <Save className="size-4" />
              Сохранить профиль
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="tk-glass-strong">
        <CardHeader>
          <CardTitle>Смена e-mail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <form action={emailRequestAction} className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="newEmailRequest">
                Новый e-mail
              </label>
              <Input
                id="newEmailRequest"
                name="newEmail"
                type="email"
                value={pendingEmail}
                onChange={(event) => setPendingEmail(event.target.value)}
                autoComplete="email"
              />
              <FormMessage state={emailRequestState} field="newEmail" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="currentPasswordEmailRequest">
                Текущий пароль
              </label>
              <Input
                id="currentPasswordEmailRequest"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
              <FormMessage state={emailRequestState} field="currentPassword" />
            </div>
            <FormMessage state={emailRequestState} />
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              <Send className="size-4" />
              Отправить код
            </Button>
          </form>

          <form action={emailConfirmAction} className="space-y-3">
            <input type="hidden" name="newEmail" value={pendingEmail} />
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="emailCode">
                Код подтверждения
              </label>
              <Input
                id="emailCode"
                name="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
              />
              <FormMessage state={emailConfirmState} field="code" />
              <FormMessage state={emailConfirmState} field="newEmail" />
            </div>
            <FormMessage state={emailConfirmState} />
            <Button type="submit" className="w-full sm:w-auto">
              <MailCheck className="size-4" />
              Подтвердить e-mail
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
