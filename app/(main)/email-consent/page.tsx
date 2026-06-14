import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  PRODUCTION_INFRASTRUCTURE,
} from "@/lib/legal/operator";

export const metadata: Metadata = {
  title: { absolute: "Согласие на email-уведомления — Тёмная Каста" },
  description: "Согласие на сервисные email-уведомления Тёмной Касты.",
  alternates: { canonical: LEGAL_DOCUMENTS.emailNotifications.href },
};

export default function EmailConsentPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.emailNotifications.title}
      description={`Версия ${LEGAL_DOCUMENTS.emailNotifications.version}. Согласие фиксируется при регистрации.`}
    >
      <LegalSection title="Какие письма отправляются">
        <p>
          Пользователь соглашается получать сервисные письма, необходимые для работы аккаунта:
          подтверждение e-mail, коды смены e-mail, восстановление пароля, сообщения безопасности и
          важные уведомления, связанные с аккаунтом, правилами сайта, модерацией или юридическими
          документами.
        </p>
        <p>
          Коды подтверждения имеют ограниченный срок действия и число попыток. Сайт хранит коды в
          виде хэшей, а не в открытом виде.
        </p>
        <p>
          Отправка выполняется через SMTP-настройки сервера. Для доставки письма SMTP-провайдеру
          передаются адрес получателя, тема, текст и технические сведения, необходимые для отправки.
        </p>
      </LegalSection>

      <LegalSection title="Фиксация согласия">
        <p>
          Факт согласия фиксируется при регистрации вместе с userId, типом согласия, версией
          документа, датой и временем, IP-адресом и user-agent, если эти сведения доступны серверу.
        </p>
      </LegalSection>

      <LegalSection title="Техническая инфраструктура">
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>{CROSS_BORDER_PROCESSING_NOTICE.statement}</p>
      </LegalSection>

      <LegalSection title="Маркетинговые письма">
        <p>
          Массовые маркетинговые рассылки и реклама по e-mail не входят в текущую функциональность
          сайта. Если такая рассылка появится, для неё потребуется отдельное основание или отдельное
          согласие пользователя. Сервисные письма, связанные с безопасностью и доступом к аккаунту,
          могут отправляться независимо от маркетинговых настроек.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
