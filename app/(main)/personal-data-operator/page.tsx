import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  getLegalOperatorInfo,
  PRODUCTION_INFRASTRUCTURE,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Сведения об операторе персональных данных — Тёмная Каста" },
  description:
    "Сведения об операторе персональных данных сайта Тёмная Каста, доменах и инфраструктуре Vercel и Neon.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalDataOperator.href },
};

export default function PersonalDataOperatorPage() {
  const operator = getLegalOperatorInfo();

  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalDataOperator.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalDataOperator.version}. Сведения относятся к доменам ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="Оператор персональных данных">
        <p>ФИО оператора: {operator.name}.</p>
        <p>Тип оператора: {operator.type}.</p>
        <p>Адрес оператора: {operator.address}.</p>
        <p>
          Email для связи:{" "}
          <a className="text-primary hover:underline" href={`mailto:${operator.email}`}>
            {operator.email}
          </a>
          .
        </p>
        <p>Телефон для связи: {operator.phone}.</p>
      </LegalSection>

      <LegalSection title="Сайт и домены">
        <p>Название сайта: «{projectConfig.name}».</p>
        <p>Основной домен: {projectConfig.domain}.</p>
        <p>
          Дополнительные домены: {" "}
          {projectConfig.domains.filter((domain) => domain !== projectConfig.domain).join(", ")}.
        </p>
      </LegalSection>

      <LegalSection title={PRODUCTION_INFRASTRUCTURE.title}>
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.network}</p>
      </LegalSection>

      <LegalSection title={CROSS_BORDER_PROCESSING_NOTICE.title}>
        <p>Инфраструктурные провайдеры: {CROSS_BORDER_PROCESSING_NOTICE.providers}.</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.legalReview}</p>
      </LegalSection>

      <LegalSection title="Роскомнадзор">
        {operator.rknNumber ? (
          <p>Номер уведомления Роскомнадзора: {operator.rknNumber}.</p>
        ) : (
          <p>
            Номер уведомления Роскомнадзора на этой странице не опубликован. Страница содержит
            публичные сведения об операторе, необходимые для пользователей сайта.
          </p>
        )}
      </LegalSection>

      <LegalSection title="Публичность сведений">
        <p>
          На сайте публикуются только необходимые публичные данные оператора: ФИО, тип оператора,
          адрес, email, телефон, домены и общие сведения об используемой облачной инфраструктуре.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
