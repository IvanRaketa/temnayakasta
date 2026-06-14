"use client";

import Link from "next/link";
import type React from "react";
import { useActionState } from "react";

import { registerAction } from "@/app/(auth)/actions";
import { initialState, type FormState } from "@/app/(auth)/form-state";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";

function ConsentCheckbox({
  name,
  children,
  errorField,
  state,
}: {
  name: string;
  children: React.ReactNode;
  errorField: string;
  state: FormState;
}) {
  return (
    <div className="space-y-1">
      <label className="tk-link-card flex items-start gap-3 p-3 text-sm leading-5 text-muted-foreground">
        <input
          name={name}
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-primary"
          required
        />
        <span>{children}</span>
      </label>
      <FormMessage state={state} field={errorField} />
    </div>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Input name="username" placeholder="username" autoComplete="username" />
        <FormMessage state={state} field="username" />
      </div>
      <div className="space-y-2">
        <Input name="email" type="email" placeholder="email@example.com" autoComplete="email" />
        <FormMessage state={state} field="email" />
      </div>
      <div className="space-y-2">
        <Input name="password" type="password" placeholder="Пароль" autoComplete="new-password" />
        <FormMessage state={state} field="password" />
      </div>
      <div className="space-y-2">
        <Input
          name="passwordConfirmation"
          type="password"
          placeholder="Повторите пароль"
          autoComplete="new-password"
        />
        <FormMessage state={state} field="passwordConfirmation" />
      </div>
      <div className="space-y-2">
        <ConsentCheckbox name="termsAccepted" errorField="termsAccepted" state={state}>
          Регистрируясь, я принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.terms.href} className="text-primary hover:underline">
            пользовательское соглашение
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="communityRulesAccepted"
          errorField="communityRulesAccepted"
          state={state}
        >
          Обязуюсь соблюдать{" "}
          <Link href={LEGAL_DOCUMENTS.communityRules.href} className="text-primary hover:underline">
            правила сообщества
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox name="privacyAccepted" errorField="privacyAccepted" state={state}>
          Ознакомлен с тем, какие данные собираются и как используются, и принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.privacy.href} className="text-primary hover:underline">
            политику конфиденциальности
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="personalDataPolicyAccepted"
          errorField="personalDataPolicyAccepted"
          state={state}
        >
          Принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.personalData.href} className="text-primary hover:underline">
            политику обработки персональных данных
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="personalDataConsentAccepted"
          errorField="personalDataConsentAccepted"
          state={state}
        >
          Даю отдельное{" "}
          <Link
            href={LEGAL_DOCUMENTS.personalDataConsent.href}
            className="text-primary hover:underline"
          >
            согласие на обработку персональных данных
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="personalDataDistributionConsentAccepted"
          errorField="personalDataDistributionConsentAccepted"
          state={state}
        >
          Понимаю, что публикуя профиль, посты, комментарии, реакции, аватар и иные публичные
          материалы, я соглашаюсь с тем, что такие данные и материалы могут быть доступны другим
          пользователям и посетителям сайта, и принимаю{" "}
          <Link
            href={LEGAL_DOCUMENTS.personalDataDistributionConsent.href}
            className="text-primary hover:underline"
          >
            согласие на распространение персональных данных
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="emailNotificationsAccepted"
          errorField="emailNotificationsAccepted"
          state={state}
        >
          Даю{" "}
          <Link
            href={LEGAL_DOCUMENTS.emailNotifications.href}
            className="text-primary hover:underline"
          >
            согласие на сервисные email-уведомления
          </Link>
          : коды подтверждения, безопасность, восстановление доступа, модерацию и важные сообщения
          аккаунта.
        </ConsentCheckbox>
        <p className="px-1 text-xs leading-5 text-muted-foreground">
          Полный комплект юридических документов доступен в разделе{" "}
          <Link href="/legal" className="text-primary hover:underline">
            правовой информации
          </Link>
          .
        </p>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Создать аккаунт</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
