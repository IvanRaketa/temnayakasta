import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  LEGAL_OPERATOR,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Согласие на распространение персональных данных — Тёмная Каста" },
  description:
    "Согласие пользователя на доступность публичных элементов профиля, публикаций, комментариев, аватаров и реакций на сайте Тёмная Каста.",
  alternates: { canonical: LEGAL_DOCUMENTS.personalDataDistributionConsent.href },
};

export default function PersonalDataDistributionConsentPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.personalDataDistributionConsent.title}
      description={`Версия ${LEGAL_DOCUMENTS.personalDataDistributionConsent.version}. Документ относится к публичным элементам сайта ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Оператор">
        <p>
          Согласие даётся оператору персональных данных {LEGAL_OPERATOR.name}. Тип оператора:{" "}
          {LEGAL_OPERATOR.type}. Email для связи:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Публичные элементы сайта">
        <p>{PUBLIC_CONTENT_NOTICE}</p>
        <p>
          Пользователь понимает, что при публикации профиля, аватара, биографии, обложки, постов,
          комментариев, реакций и иных публичных элементов сайта соответствующие данные и материалы
          могут быть доступны другим пользователям и посетителям сайта.
        </p>
      </LegalSection>

      <LegalSection title="3. Самостоятельный выбор пользователя">
        <p>
          Пользователь самостоятельно определяет содержание публикуемых материалов и не должен
          размещать данные, которые не хочет делать публичными.
        </p>
        <p>
          Пользователь не должен публиковать персональные данные третьих лиц без законного основания
          и отвечает за содержание размещаемых материалов в соответствии с пользовательским
          соглашением и правилами сообщества.
        </p>
      </LegalSection>

      <LegalSection title="4. Техническая публикация материалов">
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
      </LegalSection>

      <LegalSection title="5. Срок действия и отзыв">
        <p>
          Согласие действует до удаления соответствующих публичных материалов, удаления аккаунта,
          отзыва согласия, прекращения работы сайта либо прекращения необходимости обработки, если
          более длительное хранение не требуется по законодательству Российской Федерации, для
          защиты прав и законных интересов оператора, рассмотрения жалоб, обеспечения безопасности
          сайта или предотвращения злоупотреблений.
        </p>
        <p>
          Для отзыва согласия пользователь может удалить публичные материалы самостоятельно, если
          такая функция доступна, либо обратиться к оператору по email{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
