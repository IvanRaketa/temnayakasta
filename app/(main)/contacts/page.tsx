import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_OPERATOR } from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Контакты и юридическая информация — Тёмная Каста" },
  description: "Контакты оператора и юридическая информация проекта Тёмная Каста.",
  alternates: { canonical: "/contacts" },
};

export default function ContactsPage() {
  return (
    <LegalDocument
      title="Контакты и юридическая информация"
      description={`Контакты для доменов ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="Оператор и владелец сайта">
        <p>Оператор персональных данных: {LEGAL_OPERATOR.name}.</p>
        <p>Тип оператора: {LEGAL_OPERATOR.type}.</p>
        <p>Адрес оператора: {LEGAL_OPERATOR.address}.</p>
      </LegalSection>

      <LegalSection title="Связь">
        <p className="inline-flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          Email для связи:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
        <p className="inline-flex items-center gap-2">
          <Phone className="size-4 text-primary" />
          Телефон для связи: {LEGAL_OPERATOR.phone}.
        </p>
        <p>
          По вопросам аккаунта, персональных данных, жалоб, рекламы и безопасности используйте
          указанные контакты оператора. В обращении укажите username, тему вопроса и детали
          ситуации.
        </p>
      </LegalSection>

      <LegalSection title="Безопасность обращений">
        <p>
          Не отправляйте пароль, коды подтверждения, токены сессий, данные банковских карт и другие
          секретные сведения. Администрация может запросить дополнительную информацию для проверки
          аккаунта или рассмотрения жалобы, но не запрашивает пароль от аккаунта.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
