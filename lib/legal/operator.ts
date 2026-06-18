export const LEGAL_OPERATOR_FALLBACK = "Не указан.";

export const LEGAL_OPERATOR_TYPE = "физическое лицо";

export const LEGAL_OPERATOR = {
  name: LEGAL_OPERATOR_FALLBACK,
  type: LEGAL_OPERATOR_TYPE,
  address: LEGAL_OPERATOR_FALLBACK,
  email: LEGAL_OPERATOR_FALLBACK,
  phone: LEGAL_OPERATOR_FALLBACK,
} as const;

export const PRODUCTION_INFRASTRUCTURE = {
  title: "Размещение сайта и базы данных",
  application: "Веб-приложение размещается на self-hosted/домашнем сервере оператора.",
  database: "Рабочая база данных PostgreSQL размещается на self-hosted инфраструктуре оператора.",
  network: "Vercel и Neon не используются как текущая production-инфраструктура сайта.",
} as const;

export const CROSS_BORDER_PROCESSING_NOTICE = {
  title: "Инфраструктура и обработка технических данных",
  providers: "self-hosted инфраструктура оператора",
  purpose: "работа сайта, хранение данных, диагностика сбоев и защита инфраструктуры",
  categories: "технические данные запросов, аккаунта, сессий и пользовательского контента",
  statement: "Основная инфраструктура сайта является self-hosted. Внешние сервисы используются только если фактически подключены оператором.",
  legalReview: "Фактический состав внешних сервисов и юридические сведения проверяются оператором вручную перед публикацией.",
} as const;

export const PERSONAL_DATA_PROCESSING_PURPOSE =
  "Обеспечение работы сайта temnayakasta120.ru и дополнительного домена temnayakasta120.online, регистрации, авторизации, профилей, публикаций, комментариев, реакций, подписок, уведомлений, модерации, безопасности, технического обслуживания и исполнения пользовательского соглашения.";

export const PERSONAL_DATA_SUBJECT_CATEGORIES = [
  "посетители сайта",
  "зарегистрированные пользователи",
  "авторы публикаций и комментариев",
  "пользователи, направляющие жалобы",
] as const;

export const PERSONAL_DATA_CATEGORIES = [
  "e-mail",
  "username",
  "сведения профиля",
  "пользовательский контент",
  "комментарии",
  "реакции",
  "подписки",
  "жалобы",
  "уведомления",
  "технические данные безопасности",
] as const;

export const PERSONAL_DATA_LEGAL_BASES = [
  "законодательство о персональных данных",
  "согласие пользователя",
  "пользовательское соглашение",
  "законные интересы оператора по обеспечению безопасности сайта",
] as const;

export const PERSONAL_DATA_ACTIONS = [
  "сбор",
  "запись",
  "хранение",
  "использование",
  "уточнение",
  "удаление",
  "уничтожение",
] as const;

export const PERSONAL_DATA_STORAGE_TERM =
  "Обработка данных осуществляется до достижения целей обработки, удаления аккаунта, отзыва согласия, прекращения работы сайта либо прекращения необходимости обработки, если более длительное хранение не требуется по закону или для защиты прав оператора.";

export const PERSONAL_DATA_SECURITY_MEASURES =
  "Разграничение доступа по ролям, авторизация, хранение паролей и сессий в виде хэшей, cookie-защита, ограничение частоты запросов, журналы безопасности, очистка пользовательского контента, контроль загрузок, резервное копирование вне публичных директорий, HTTPS/TLS при фактической настройке, серверные и прикладные меры защиты.";

export const PUBLIC_CONTENT_NOTICE =
  "Публикуя профиль, посты, комментарии, реакции, аватар и иные публичные материалы, пользователь соглашается с тем, что такие данные и материалы могут быть доступны другим пользователям и посетителям сайта.";

export function getLegalOperatorInfo() {
  return {
    name: LEGAL_OPERATOR.name,
    type: LEGAL_OPERATOR.type,
    email: LEGAL_OPERATOR.email,
    phone: LEGAL_OPERATOR.phone,
    address: LEGAL_OPERATOR.address,
    rknNumber: null,
  };
}

export function hasLegalOperatorInfo() {
  return false;
}
