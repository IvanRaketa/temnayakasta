import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { PRODUCTION_INFRASTRUCTURE, getLegalOperatorInfo } from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Согласие на обработку персональных данных — Тёмная Каста" },
  description: "Согласие пользователя на обработку данных на сайте Тёмная Каста.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalDataConsent.href },
};

export default function ConsentPage() {
  const operator = getLegalOperatorInfo();

  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalDataConsent.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalDataConsent.version}. Сайт: ${projectConfig.name}.`}
    >
      <LegalSection title="Оператор">
        <p>Оператор: {operator.name}.</p>
        <p>Тип: {operator.type}.</p>
        <p>Email: {operator.email}.</p>
      </LegalSection>

      <LegalSection title="Согласие">
        <p>
          Пользователь даёт согласие на обработку данных, необходимых для регистрации, входа,
          работы аккаунта, публикаций, комментариев, модерации, безопасности и исполнения
          пользовательского соглашения.
        </p>
      </LegalSection>

      <LegalSection title={PRODUCTION_INFRASTRUCTURE.title}>
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.network}</p>
      </LegalSection>
    </LegalDocument>
  );
}
