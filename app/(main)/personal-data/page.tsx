import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  LEGAL_OPERATOR,
  PERSONAL_DATA_ACTIONS,
  PERSONAL_DATA_CATEGORIES,
  PERSONAL_DATA_LEGAL_BASES,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PERSONAL_DATA_SECURITY_MEASURES,
  PERSONAL_DATA_STORAGE_TERM,
  PERSONAL_DATA_SUBJECT_CATEGORIES,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Политика обработки персональных данных — Тёмная Каста" },
  description:
    "Политика обработки персональных данных пользователей сайта Тёмная Каста: оператор, цели, категории данных, Vercel и Neon.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalData.href },
};

export default function PersonalDataPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalData.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalData.version}. Документ описывает обработку персональных данных на доменах ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Оператор">
        <p>
          Оператор персональных данных: {LEGAL_OPERATOR.name}. Тип оператора: {LEGAL_OPERATOR.type}.
          Адрес оператора: {LEGAL_OPERATOR.address}. Email для обращений по персональным данным:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          . Телефон для связи: {LEGAL_OPERATOR.phone}. Домены сайта:{" "}
          {projectConfig.domains.join(", ")}.
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

      <LegalSection title="2. Категории субъектов персональных данных">
        <LegalList items={PERSONAL_DATA_SUBJECT_CATEGORIES} />
      </LegalSection>

      <LegalSection title="3. Категории персональных данных">
        <LegalList items={PERSONAL_DATA_CATEGORIES} />
      </LegalSection>

      <LegalSection title="4. Специальные и биометрические данные">
        <p>Специальные категории персональных данных не обрабатываются.</p>
        <p>Биометрические персональные данные не обрабатываются.</p>
        <p>
          Аватар пользователя может содержать изображение человека, однако сайт не использует
          изображения для установления личности, биометрической идентификации или аутентификации
          пользователя.
        </p>
      </LegalSection>

      <LegalSection title="5. Цели обработки">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="6. Правовые основания обработки">
        <LegalList items={PERSONAL_DATA_LEGAL_BASES} />
      </LegalSection>

      <LegalSection title="7. Действия с персональными данными">
        <p>{PERSONAL_DATA_ACTIONS.join(", ")}.</p>
        <p>
          Распространение возможно в отношении публичных элементов сайта: профилей, публикаций,
          комментариев, аватаров, реакций и иного пользовательского контента, доступного другим
          пользователям и посетителям сайта.
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
        <p>Цели обработки: {CROSS_BORDER_PROCESSING_NOTICE.purpose}.</p>
        <p>Возможные категории данных: {CROSS_BORDER_PROCESSING_NOTICE.categories}.</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.legalReview}</p>
      </LegalSection>

      <LegalSection title="10. Сроки обработки">
        <p>{PERSONAL_DATA_STORAGE_TERM}</p>
      </LegalSection>

      <LegalSection title="11. Меры защиты">
        <p>{PERSONAL_DATA_SECURITY_MEASURES}</p>
      </LegalSection>

      <LegalSection title="12. СКЗИ">
        <p>
          Сертифицированные средства криптографической защиты информации оператором самостоятельно
          не используются.
        </p>
        <p>
          Для защиты соединения с сайтом применяется HTTPS/TLS на платформе размещения.
        </p>
      </LegalSection>

      <LegalSection title="13. Публичные элементы сайта">
        <p>{PUBLIC_CONTENT_NOTICE}</p>
        <p>
          Пользователь самостоятельно определяет содержание публикуемых материалов и не должен
          размещать данные, которые не хочет делать публичными.
        </p>
      </LegalSection>

      <LegalSection title="14. Права субъекта данных">
        <p>
          Пользователь вправе запросить сведения об обработке своих персональных данных, уточнение,
          блокирование или удаление данных, а также отозвать согласие. Для таких обращений
          используется страница контактов или email оператора.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
