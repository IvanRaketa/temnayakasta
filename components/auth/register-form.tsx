"use client";

import Link from "next/link";
import type React from "react";
import { useActionState, useState } from "react";

import { registerAction } from "@/app/(auth)/actions";
import { initialState, type FormState } from "@/app/(auth)/form-state";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { useAuthPageRecovery } from "@/components/auth/use-auth-page-recovery";
import { Input } from "@/components/ui/input";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";

const initialConsents = {
  termsAccepted: false,
  communityRulesAccepted: false,
  privacyAccepted: false,
  personalDataPolicyAccepted: false,
  personalDataConsentAccepted: false,
  personalDataDistributionConsentAccepted: false,
  emailNotificationsAccepted: false,
};

type ConsentField = keyof typeof initialConsents;

function ConsentCheckbox({
  name,
  children,
  state,
  checked,
  onCheckedChange,
}: {
  name: ConsentField;
  children: React.ReactNode;
  state: FormState;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="tk-link-card flex items-start gap-3 p-3 text-sm leading-5 text-muted-foreground">
        <input
          name={name}
          value="on"
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-primary"
          checked={checked}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          required
        />
        <span>{children}</span>
      </label>
      <FormMessage state={state} field={name} />
    </div>
  );
}

export function RegisterForm() {
  const formVersion = useAuthPageRecovery();

  return <RegisterFormFields key={formVersion} />;
}

function RegisterFormFields() {
  const [state, action] = useActionState(registerAction, initialState);
  const [consents, setConsents] = useState(initialConsents);

  function setConsent(name: ConsentField, checked: boolean) {
    setConsents((current) => ({ ...current, [name]: checked }));
  }

  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <div className="space-y-2">
        <Input name="username" placeholder="username" autoComplete="username" required />
        <FormMessage state={state} field="username" />
      </div>
      <div className="space-y-2">
        <Input name="email" type="email" placeholder="email@example.com" autoComplete="email" required />
        <FormMessage state={state} field="email" />
      </div>
      <div className="space-y-2">
        <Input
          name="password"
          type="password"
          placeholder="Пароль"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormMessage state={state} field="password" />
      </div>
      <div className="space-y-2">
        <Input
          name="passwordConfirmation"
          type="password"
          placeholder="Повторите пароль"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormMessage state={state} field="passwordConfirmation" />
      </div>
      <div className="space-y-2">
        <ConsentCheckbox
          name="termsAccepted"
          state={state}
          checked={consents.termsAccepted}
          onCheckedChange={(checked) => setConsent("termsAccepted", checked)}
        >
          Регистрируясь, я принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.terms.href} className="text-primary hover:underline">
            пользовательское соглашение
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="communityRulesAccepted"
          state={state}
          checked={consents.communityRulesAccepted}
          onCheckedChange={(checked) => setConsent("communityRulesAccepted", checked)}
        >
          Обязуюсь соблюдать{" "}
          <Link href={LEGAL_DOCUMENTS.communityRules.href} className="text-primary hover:underline">
            правила сообщества
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="privacyAccepted"
          state={state}
          checked={consents.privacyAccepted}
          onCheckedChange={(checked) => setConsent("privacyAccepted", checked)}
        >
          Ознакомлен с тем, какие данные собираются и как используются, и принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.privacy.href} className="text-primary hover:underline">
            политику конфиденциальности
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="personalDataPolicyAccepted"
          state={state}
          checked={consents.personalDataPolicyAccepted}
          onCheckedChange={(checked) => setConsent("personalDataPolicyAccepted", checked)}
        >
          Принимаю{" "}
          <Link href={LEGAL_DOCUMENTS.personalData.href} className="text-primary hover:underline">
            политику обработки персональных данных
          </Link>
          .
        </ConsentCheckbox>
        <ConsentCheckbox
          name="personalDataConsentAccepted"
          state={state}
          checked={consents.personalDataConsentAccepted}
          onCheckedChange={(checked) => setConsent("personalDataConsentAccepted", checked)}
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
          state={state}
          checked={consents.personalDataDistributionConsentAccepted}
          onCheckedChange={(checked) =>
            setConsent("personalDataDistributionConsentAccepted", checked)
          }
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
          state={state}
          checked={consents.emailNotificationsAccepted}
          onCheckedChange={(checked) => setConsent("emailNotificationsAccepted", checked)}
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
