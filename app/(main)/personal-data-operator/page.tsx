import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CLOUDFLARE_TRANSFER,
  getLegalOperatorInfo,
  RUSSIAN_DATABASE_LOCATION,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Сведения об операторе персональных данных — Тёмная Каста" },
  description:
    "Сведения об операторе персональных данных сайта Тёмная Каста, доменах, базе данных в РФ и Cloudflare.",
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
        <p>Дополнительные домены: {projectConfig.domains.join(", ")}.</p>
      </LegalSection>

      <LegalSection title={RUSSIAN_DATABASE_LOCATION.title}>
        <p>{RUSSIAN_DATABASE_LOCATION.statement}</p>
        <p>{RUSSIAN_DATABASE_LOCATION.infrastructure}</p>
        <p>{RUSSIAN_DATABASE_LOCATION.address}.</p>
      </LegalSection>

      <LegalSection title={CLOUDFLARE_TRANSFER.title}>
        <p>Сайт использует Cloudflare для: {CLOUDFLARE_TRANSFER.services}.</p>
        <p>
          В связи с использованием Cloudflare может осуществляться трансграничная передача
          технических данных.
        </p>
        <p>
          Получатель: {CLOUDFLARE_TRANSFER.recipient}, {CLOUDFLARE_TRANSFER.address}
        </p>
        <p>Страна: {CLOUDFLARE_TRANSFER.country}.</p>
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
          адрес, email, телефон, домены, сведения о базе данных в Российской Федерации и информация
          об использовании Cloudflare.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
