import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PERSONAL_DATA_SECURITY_MEASURES,
  PERSONAL_DATA_STORAGE_TERM,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
  getLegalOperatorInfo,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Политика обработки персональных данных — Тёмная Каста" },
  description:
    "Политика обработки персональных данных пользователей сайта Тёмная Каста: оператор, цели обработки и self-hosted инфраструктура.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalData.href },
};

export default function PersonalDataPage() {
  const operator = getLegalOperatorInfo();

  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalData.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalData.version}. Документ относится к доменам ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Оператор">
        <p>
          Оператор: {operator.name}. Тип оператора: {operator.type}. Адрес: {operator.address}.
          Email: {operator.email}. Телефон: {operator.phone}.
        </p>
        <p>
          Отдельные сведения об операторе опубликованы в разделе{" "}
          <Link
            href={LEGAL_DOCUMENTS.personalDataOperator.href}
            className="text-primary hover:underline"
          >
            «Сведения об операторе персональных данных»
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Цель обработки">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title={PRODUCTION_INFRASTRUCTURE.title}>
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.network}</p>
      </LegalSection>

      <LegalSection title={CROSS_BORDER_PROCESSING_NOTICE.title}>
        <p>Инфраструктура: {CROSS_BORDER_PROCESSING_NOTICE.providers}.</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.legalReview}</p>
      </LegalSection>

      <LegalSection title="4. Сроки обработки">
        <p>{PERSONAL_DATA_STORAGE_TERM}</p>
      </LegalSection>

      <LegalSection title="5. Меры защиты">
        <p>{PERSONAL_DATA_SECURITY_MEASURES}</p>
      </LegalSection>

      <LegalSection title="6. Публичные элементы сайта">
        <p>{PUBLIC_CONTENT_NOTICE}</p>
      </LegalSection>
    </LegalDocument>
  );
}
