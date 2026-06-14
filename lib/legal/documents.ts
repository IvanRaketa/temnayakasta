export const LEGAL_DOCUMENTS = {
  terms: {
    type: "TERMS_OF_USE",
    version: "2026-06-14",
    title: "Пользовательское соглашение",
    href: "/terms",
  },
  privacy: {
    type: "PRIVACY_POLICY",
    version: "2026-06-14",
    title: "Политика конфиденциальности",
    href: "/privacy",
  },
  communityRules: {
    type: "COMMUNITY_RULES",
    version: "2026-06-12",
    title: "Правила сообщества",
    href: "/community-rules",
  },
  personalData: {
    type: "PERSONAL_DATA_POLICY",
    version: "2026-06-14",
    title: "Политика обработки персональных данных",
    href: "/personal-data",
  },
  personalDataConsent: {
    type: "PERSONAL_DATA_CONSENT",
    version: "2026-06-14",
    title: "Согласие на обработку персональных данных",
    href: "/consent",
  },
  personalDataDistributionConsent: {
    type: "PERSONAL_DATA_DISTRIBUTION_CONSENT",
    version: "2026-06-14",
    title: "Согласие на распространение персональных данных",
    href: "/personal-data-distribution-consent",
  },
  emailNotifications: {
    type: "EMAIL_NOTIFICATIONS_CONSENT",
    version: "2026-06-14",
    title: "Согласие на email-уведомления",
    href: "/email-consent",
  },
  personalDataOperator: {
    type: "PERSONAL_DATA_OPERATOR_INFO",
    version: "2026-06-14",
    title: "Сведения об операторе персональных данных",
    href: "/personal-data-operator",
  },
} as const;

export const REQUIRED_REGISTRATION_CONSENTS = [
  LEGAL_DOCUMENTS.terms,
  LEGAL_DOCUMENTS.communityRules,
  LEGAL_DOCUMENTS.privacy,
  LEGAL_DOCUMENTS.personalData,
  LEGAL_DOCUMENTS.personalDataConsent,
  LEGAL_DOCUMENTS.personalDataDistributionConsent,
  LEGAL_DOCUMENTS.emailNotifications,
] as const;
