import type { Metadata } from "next";

import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  PERSONAL_DATA_CATEGORIES,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PERSONAL_DATA_SECURITY_MEASURES,
  PERSONAL_DATA_STORAGE_TERM,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
  getLegalOperatorInfo,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Политика конфиденциальности — Тёмная Каста" },
  description:
    "Политика конфиденциальности сайта Тёмная Каста: оператор, домены, self-hosted инфраструктура и защита данных.",
  alternates: { canonical: LEGAL_DOCUMENTS.privacy.href },
};

export default function PrivacyPage() {
  const operator = getLegalOperatorInfo();

  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.privacy.title}
      description={`Версия ${LEGAL_DOCUMENTS.privacy.version}. Действует для доменов ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Оператор и домены сайта">
        <p>
          Оператор персональных данных: {operator.name}. Тип оператора: {operator.type}. Адрес
          оператора: {operator.address}. Email для связи: {operator.email}. Телефон для связи: {operator.phone}.
        </p>
        <p>Сайт размещается на доменах {projectConfig.domains.join(", ")}.</p>
      </LegalSection>

      <LegalSection title="2. Цель обработки данных">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="3. Какие данные обрабатываются">
        <LegalList items={PERSONAL_DATA_CATEGORIES} />
      </LegalSection>

      <LegalSection title="4. Публичный контент">
        <p>{PUBLIC_CONTENT_NOTICE}</p>
      </LegalSection>

      <LegalSection title={PRODUCTION_INFRASTRUCTURE.title}>
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.network}</p>
      </LegalSection>

      <LegalSection title={CROSS_BORDER_PROCESSING_NOTICE.title}>
        <p>Инфраструктура: {CROSS_BORDER_PROCESSING_NOTICE.providers}.</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
        <p>Цели обработки: {CROSS_BORDER_PROCESSING_NOTICE.purpose}.</p>
        <p>Возможные категории данных: {CROSS_BORDER_PROCESSING_NOTICE.categories}.</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.legalReview}</p>
      </LegalSection>

      <LegalSection title="7. Сроки обработки и удаление">
        <p>{PERSONAL_DATA_STORAGE_TERM}</p>
      </LegalSection>

      <LegalSection title="8. Защита данных">
        <p>{PERSONAL_DATA_SECURITY_MEASURES}</p>
      </LegalSection>

      <LegalSection title="9. HTTPS/TLS">
        <p>
          Для защиты соединения с сайтом применяется HTTPS/TLS при фактической настройке публичного
          HTTPS для production-доменов.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
