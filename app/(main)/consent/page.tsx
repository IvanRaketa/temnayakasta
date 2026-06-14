import type { Metadata } from "next";

import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  LEGAL_OPERATOR,
  PERSONAL_DATA_ACTIONS,
  PERSONAL_DATA_CATEGORIES,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PERSONAL_DATA_STORAGE_TERM,
  PRODUCTION_INFRASTRUCTURE,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Согласие на обработку персональных данных — Тёмная Каста" },
  description:
    "Согласие пользователя на обработку персональных данных оператором сайта Тёмная Каста.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalDataConsent.href },
};

export default function ConsentPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalDataConsent.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalDataConsent.version}. Согласие фиксируется отдельной отметкой при регистрации.`}
    >
      <LegalSection title="1. Текст согласия">
        <p>
          Я даю согласие оператору персональных данных {LEGAL_OPERATOR.name} на обработку моих
          персональных данных в целях регистрации, авторизации, использования функций сайта «
          {projectConfig.name}», публикации контента, комментариев, реакций, подписок, уведомлений,
          модерации, рассмотрения жалоб, обеспечения безопасности сайта, восстановления доступа,
          технического обслуживания сайта и исполнения пользовательского соглашения.
        </p>
      </LegalSection>

      <LegalSection title="2. Оператор">
        <p>Оператор персональных данных: {LEGAL_OPERATOR.name}.</p>
        <p>Тип оператора: {LEGAL_OPERATOR.type}.</p>
        <p>Адрес оператора: {LEGAL_OPERATOR.address}.</p>
        <p>
          Контактный email:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
        <p>Контактный телефон: {LEGAL_OPERATOR.phone}.</p>
      </LegalSection>

      <LegalSection title="3. Цель обработки">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="4. Категории данных">
        <LegalList items={PERSONAL_DATA_CATEGORIES} />
      </LegalSection>

      <LegalSection title="5. Действия с данными">
        <p>{PERSONAL_DATA_ACTIONS.join(", ")}.</p>
        <p>
          Распространение возможно в отношении публичных элементов сайта: профилей, публикаций,
          комментариев, аватаров, реакций и иного пользовательского контента, доступного другим
          пользователям и посетителям сайта.
        </p>
      </LegalSection>

      <LegalSection title="6. Срок действия согласия">
        <p>{PERSONAL_DATA_STORAGE_TERM}</p>
      </LegalSection>

      <LegalSection title="7. Инфраструктура обработки">
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.legalReview}</p>
      </LegalSection>

      <LegalSection title="8. Отзыв согласия">
        <p>
          Пользователь может отозвать согласие, направив обращение оператору по email{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          . Отзыв согласия может привести к невозможности пользоваться аккаунтом, если обработка
          данных необходима для работы сайта, исполнения пользовательского соглашения, безопасности,
          рассмотрения жалоб или соблюдения законодательства Российской Федерации.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
