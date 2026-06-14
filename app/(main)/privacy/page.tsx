import type { Metadata } from "next";

import { LegalDocument, LegalList, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CLOUDFLARE_TRANSFER,
  LEGAL_OPERATOR,
  PERSONAL_DATA_CATEGORIES,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PERSONAL_DATA_SECURITY_MEASURES,
  PERSONAL_DATA_STORAGE_TERM,
  PUBLIC_CONTENT_NOTICE,
  RUSSIAN_DATABASE_LOCATION,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Политика конфиденциальности — Тёмная Каста" },
  description:
    "Политика конфиденциальности сайта Тёмная Каста: оператор, домены, цели обработки, Cloudflare и защита данных.",
  alternates: { canonical: LEGAL_DOCUMENTS.privacy.href },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.privacy.title}
      description={`Версия ${LEGAL_DOCUMENTS.privacy.version}. Действует для доменов ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Оператор и домены сайта">
        <p>
          Оператор персональных данных: {LEGAL_OPERATOR.name}. Тип оператора: {LEGAL_OPERATOR.type}.
          Адрес оператора: {LEGAL_OPERATOR.address}. Email для связи:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          . Телефон для связи: {LEGAL_OPERATOR.phone}.
        </p>
        <p>
          Сайт «{projectConfig.name}» размещается на доменах {projectConfig.domains.join(", ")}.
        </p>
      </LegalSection>

      <LegalSection title="2. Назначение сайта">
        <p>
          Сайт является пользовательской контент-платформой с регистрацией, авторизацией, профилями
          пользователей, публикациями, комментариями, реакциями, подписками, жалобами,
          уведомлениями, модерацией, ролями администратора/модератора, журналами безопасности,
          email-подтверждением и технической защитой от злоупотреблений.
        </p>
      </LegalSection>

      <LegalSection title="3. Цель обработки данных">
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="4. Какие данные обрабатываются">
        <LegalList items={PERSONAL_DATA_CATEGORIES} />
        <p>
          Специальные категории персональных данных не обрабатываются. Биометрические персональные
          данные не обрабатываются. Аватар пользователя может содержать изображение человека, однако
          сайт не использует изображения для установления личности, биометрической идентификации или
          аутентификации пользователя.
        </p>
      </LegalSection>

      <LegalSection title="5. Авторизация, e-mail и cookies">
        <p>
          Для авторизации сайт использует cookie сессии и серверные записи сессий. Пароли и токены
          сессий не хранятся в открытом виде: сохраняются только хэши. Для подтверждения e-mail,
          восстановления доступа и смены e-mail создаются одноразовые коды в виде хэшей.
        </p>
        <p>
          Почтовая система используется для сервисных писем: подтверждение e-mail, восстановление
          доступа, смена e-mail, безопасность и важные сообщения аккаунта. Массовая рекламная
          рассылка по e-mail не является частью текущей работы сайта.
        </p>
      </LegalSection>

      <LegalSection title="6. Публичный контент">
        <p>{PUBLIC_CONTENT_NOTICE}</p>
        <p>
          Username, отображаемое имя, аватар, биография профиля, обложка, опубликованные посты,
          теги, комментарии, реакции, число просмотров и часть активности могут отображаться
          публично. E-mail пользователя, хэш пароля, коды подтверждения, IP-адреса, user-agent,
          сессии и служебные журналы не показываются на публичных страницах.
        </p>
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
        <p>Цель передачи: {CLOUDFLARE_TRANSFER.purpose}.</p>
        <p>Категории данных при такой передаче: {CLOUDFLARE_TRANSFER.categories}.</p>
        <p>{CLOUDFLARE_TRANSFER.proxyNotice}</p>
      </LegalSection>

      <LegalSection title="9. Сроки обработки и удаление">
        <p>{PERSONAL_DATA_STORAGE_TERM}</p>
        <p>
          Чтобы удалить аккаунт или запросить уточнение данных, пользователь обращается через
          страницу контактов или по email оператора. При удалении часть публичного контента может
          быть удалена, скрыта или сохранена в обезличенном/служебном виде, если это необходимо для
          безопасности, споров, жалоб, аудита или требований закона.
        </p>
      </LegalSection>

      <LegalSection title="10. Защита данных">
        <p>{PERSONAL_DATA_SECURITY_MEASURES}</p>
      </LegalSection>

      <LegalSection title="11. СКЗИ и HTTPS/TLS">
        <p>
          Сертифицированные средства криптографической защиты информации оператором самостоятельно
          не используются.
        </p>
        <p>
          Для защиты соединения с сайтом применяется HTTPS/TLS, в том числе через сервис Cloudflare.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
