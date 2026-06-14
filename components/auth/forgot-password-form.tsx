"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/(auth)/actions";
import { initialState } from "@/app/(auth)/form-state";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";

interface ForgotPasswordFormProps {
  email?: string;
}

export function ForgotPasswordForm({ email = "" }: ForgotPasswordFormProps) {
  const [requestState, requestAction] = useActionState(requestPasswordResetAction, initialState);
  const [resetState, resetAction] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="space-y-6">
      <form action={requestAction} className="space-y-4">
        <div className="space-y-2">
          <Input name="email" type="email" placeholder="email@example.com" defaultValue={email} />
          <FormMessage state={requestState} field="email" />
        </div>
        <FormMessage state={requestState} />
        <SubmitButton>Получить код</SubmitButton>
      </form>

      <div className="h-px bg-border" />

      <form action={resetAction} className="space-y-4">
        <Input name="email" type="email" placeholder="email@example.com" defaultValue={email} />
        <FormMessage state={resetState} field="email" />
        <Input name="code" inputMode="numeric" maxLength={6} placeholder="Код из письма" />
        <FormMessage state={resetState} field="code" />
        <Input name="password" type="password" placeholder="Новый пароль" autoComplete="new-password" />
        <FormMessage state={resetState} field="password" />
        <Input
          name="passwordConfirmation"
          type="password"
          placeholder="Повторите новый пароль"
          autoComplete="new-password"
        />
        <FormMessage state={resetState} field="passwordConfirmation" />
        <FormMessage state={resetState} />
        <SubmitButton>Установить новый пароль</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Вспомнили пароль?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
