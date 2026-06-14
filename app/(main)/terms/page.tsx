import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import {
  CROSS_BORDER_PROCESSING_NOTICE,
  LEGAL_OPERATOR,
  PERSONAL_DATA_PROCESSING_PURPOSE,
  PRODUCTION_INFRASTRUCTURE,
  PUBLIC_CONTENT_NOTICE,
} from "@/lib/legal/operator";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Пользовательское соглашение — Тёмная Каста" },
  description:
    "Пользовательское соглашение сайта Тёмная Каста: правила аккаунта, публикаций, модерации, персональных данных и инфраструктуры.",
  alternates: { canonical: LEGAL_DOCUMENTS.terms.href },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title={LEGAL_DOCUMENTS.terms.title}
      description={`Версия ${LEGAL_DOCUMENTS.terms.version}. Документ применяется к доменам ${projectConfig.domains.join(", ")}.`}
    >
      <LegalSection title="1. Общие положения">
        <p>
          Сайт «{projectConfig.name}» принадлежит и администрируется оператором{" "}
          {LEGAL_OPERATOR.name}. Тип оператора: {LEGAL_OPERATOR.type}. Контактный email:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_OPERATOR.email}`}>
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
        <p>
          Сайт является пользовательской контент-платформой для регистрации, авторизации, ведения
          профилей, публикаций, комментариев, реакций, подписок, жалоб, уведомлений и модерации.
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
          ,{" "}
          <Link
            href={LEGAL_DOCUMENTS.personalDataConsent.href}
            className="text-primary hover:underline"
          >
            согласием на обработку персональных данных
          </Link>{" "}
          и{" "}
          <Link href={LEGAL_DOCUMENTS.communityRules.href} className="text-primary hover:underline">
            правилами сообщества
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Аккаунт">
        <p>
          Для регистрации нужны username, e-mail и пароль. Пользователь отвечает за достоверность
          данных, сохранность пароля, безопасность устройства и действия в своём аккаунте. Сайт
          может ограничить функции до подтверждения e-mail и может завершать сессии при смене
          пароля, подозрительной активности или блокировке.
        </p>
      </LegalSection>

      <LegalSection title="3. Пользовательский контент">
        <p>
          Пользователь может создавать публикации, комментарии, профильные описания, изображения,
          реакции, подписки и жалобы. Пользователь отвечает за законность, достоверность и
          безопасность размещаемых материалов, а также за наличие прав на тексты, изображения и
          другие элементы, которые он публикует.
        </p>
        <p>
          Пользователь сохраняет права на свой контент, но предоставляет сайту право технически
          хранить, отображать, индексировать внутри сайта, обрабатывать для рекомендаций,
          модерировать и удалять такой контент в рамках работы платформы.
        </p>
        <p>{PUBLIC_CONTENT_NOTICE}</p>
      </LegalSection>

      <LegalSection title="4. Персональные данные">
        <p>
          Пользователь соглашается с обработкой персональных данных в объёме, необходимом для работы
          сайта и исполнения настоящего пользовательского соглашения.
        </p>
        <p>{PERSONAL_DATA_PROCESSING_PURPOSE}</p>
      </LegalSection>

      <LegalSection title="5. Правила сообщества">
        <p>
          Пользователь принимает правила сообщества и обязуется не размещать незаконные материалы,
          спам, угрозы, травлю, мошенничество, вредоносные ссылки, чужие персональные данные без
          основания, материалы для обхода модерации и иные запрещённые правилами публикации.
        </p>
      </LegalSection>

      <LegalSection title="6. Модерация">
        <p>
          Администрация и модераторы могут скрывать, блокировать или переводить материалы на
          проверку, рассматривать жалобы, ограничивать аккаунты и фиксировать действия в журнале
          аудита для безопасности сайта. Модерация может применяться к постам, комментариям,
          профилям, жалобам и аккаунтам.
        </p>
      </LegalSection>

      <LegalSection title="7. Premium и внутренняя реклама">
        <p>
          Premium-функции сейчас предоставляются администрацией сайта внутри проекта. Публичная
          покупка Premium недоступна, сайт не принимает оплату и не хранит платёжные реквизиты.
          Активный Premium может открывать визуальные эффекты профиля и отключает показ внутренней
          рекламы.
        </p>
        <p>
          На сайте предусмотрен технический каркас для внутренних рекламных блоков (AdSlot).
          Наличие такого каркаса не означает, что подключена активная рекламная сеть или идёт
          действующая рекламная кампания. При фактическом размещении рекламы материалы должны
          маркироваться в соответствии с применимыми требованиями.
        </p>
      </LegalSection>

      <LegalSection title="8. Инфраструктура и доступность">
        <p>{PRODUCTION_INFRASTRUCTURE.application}</p>
        <p>{PRODUCTION_INFRASTRUCTURE.database}</p>
        <p>
          {CROSS_BORDER_PROCESSING_NOTICE.statement} Возможные категории данных: {" "}
          {CROSS_BORDER_PROCESSING_NOTICE.categories}.
        </p>
      </LegalSection>

      <LegalSection title="9. Ограничения сервиса">
        <p>
          Сервис может быть временно недоступен из-за технических работ, ошибок инфраструктуры,
          обновлений, защиты от атак или проблем у провайдеров. Отдельные функции могут быть
          ограничены для неподтверждённых, заблокированных или подозрительных аккаунтов.
        </p>
      </LegalSection>

      <LegalSection title="10. Изменения документов">
        <p>
          Документы могут обновляться. Существенные изменения публикуются на сайте, а при
          необходимости пользователь может быть уведомлён по e-mail.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
