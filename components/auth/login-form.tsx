"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/(auth)/actions";
import { initialState } from "@/app/(auth)/form-state";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Input name="identifier" placeholder="email или username" autoComplete="username" />
        <FormMessage state={state} field="identifier" />
      </div>
      <div className="space-y-2">
        <Input name="password" type="password" placeholder="Пароль" autoComplete="current-password" />
        <FormMessage state={state} field="password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Войти</SubmitButton>
      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Забыли пароль?
        </Link>
        <span>
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Регистрация
          </Link>
        </span>
      </div>
    </form>
  );
}
