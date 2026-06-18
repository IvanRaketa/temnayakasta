import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
  getLegalOperatorInfo,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Пользовательское соглашение — Тёмная Каста" },
  description:
    "Пользовательское соглашение сайта Тёмная Каста: правила аккаунта, публикаций, модерации, персональных данных и инфраструктуры.",
  alternates: { canonical: LEGAL_DOCUMENTS.terms.href },
};

export default function TermsPage() {
  const operator = getLegalOperatorInfo();

  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.terms.title}
      description={`Версия ${LEGAL_DOCUMENTS.terms.version}. Документ применяется к доменам ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Общие положения">
        <p>
          Сайт «{projectConfig.name}» принадлежит и администрируется оператором {operator.name}.
          Тип оператора: {operator.type}. Контактный email: {operator.email}.
        </p>
        <p>
          Используя сайт, пользователь подтверждает, что ознакомился и согласен с{" "}
          <Link href={LEGAL_DOCUMENTS.privacy.href} className="text-primary hover:underline">
            политикой конфиденциальности
          </Link>
          ,{" "}
          <Link href={LEGAL_DOCUMENTS.personalData.href} className="text-primary hover:underline">
            политикой обработки персональных данных
          </Link>
          , согласием на обработку персональных данных и правилами сообщества.
        </p>
      </LegalSection>

      <LegalSection title="2. Аккаунт">
        <p>
          Для регистрации нужны username, e-mail и пароль. Пользователь отвечает за достоверность
          данных, сохранность пароля, безопасность устройства и действия в своём аккаунте.
        </p>
      </LegalSection>

      <LegalSection title="3. Пользовательский контент">
        <p>
          Пользователь может создавать публикации, комментарии, профильные описания, изображения,
          реакции, подписки и жалобы. Пользователь отвечает за законность и безопасность размещаемых
          материалов.
        </p>
        <p>{PUBLIC_CONTENT_NOTICE}</p>
      </LegalSection>

      <LegalSection title="4. Персональные данные">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="5. Модерация">
        <p>
          Администрация и модераторы могут скрывать, блокировать или переводить материалы на
          проверку, рассматривать жалобы, ограничивать аккаунты и фиксировать действия в журнале
          аудита для безопасности сайта.
        </p>
      </LegalSection>

      <LegalSection title="6. Premium и внутренняя реклама">
        <p>
          Premium-функции сейчас предоставляются администрацией сайта внутри проекта. Публичная
          покупка Premium недоступна, сайт не принимает оплату и не хранит платёжные реквизиты.
        </p>
      </LegalSection>

      <LegalSection title="7. Инфраструктура и доступность">
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.network}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
      </LegalSection>

      <LegalSection title="8. Изменения документов">
        <p>
          Документы могут обновляться. Существенные изменения публикуются на сайте, а при
          необходимости пользователь может быть уведомлён по e-mail.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
