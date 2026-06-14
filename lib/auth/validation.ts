export interface ValidationResult<T> {
  data?: T;
  errors: Record<string, string>;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-z0-9_]{3,30}$/;

function valueOf(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().normalize("NFKC").toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().normalize("NFKC").toLowerCase();
}

export function validateRegistration(formData: FormData): ValidationResult<{
  username: string;
  email: string;
  password: string;
  consents: {
    terms: boolean;
    communityRules: boolean;
    privacy: boolean;
    personalDataPolicy: boolean;
    personalDataConsent: boolean;
    personalDataDistributionConsent: boolean;
    emailNotifications: boolean;
  };
}> {
  const username = normalizeUsername(valueOf(formData, "username"));
  const email = normalizeEmail(valueOf(formData, "email"));
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const consents = {
    terms: formData.get("termsAccepted") === "on",
    communityRules: formData.get("communityRulesAccepted") === "on",
    privacy: formData.get("privacyAccepted") === "on",
    personalDataPolicy: formData.get("personalDataPolicyAccepted") === "on",
    personalDataConsent: formData.get("personalDataConsentAccepted") === "on",
    personalDataDistributionConsent:
      formData.get("personalDataDistributionConsentAccepted") === "on",
    emailNotifications: formData.get("emailNotificationsAccepted") === "on",
  };
  const errors: Record<string, string> = {};

  if (!username) errors.username = "Укажите username.";
  else if (!usernamePattern.test(username)) {
    errors.username = "Username: 3-30 символов, латиница, цифры и подчёркивание.";
  }

  if (!email) errors.email = "Укажите email.";
  else if (email.length > 254 || !emailPattern.test(email))
    errors.email = "Укажите корректный email.";

  if (!password) errors.password = "Укажите пароль.";
  else if (password.length < 8) errors.password = "Пароль должен быть не короче 8 символов.";
  else if (password.length > 128) errors.password = "Пароль слишком длинный.";

  if (password !== passwordConfirmation) {
    errors.passwordConfirmation = "Пароли не совпадают.";
  }

  if (!consents.terms) errors.termsAccepted = "Примите пользовательское соглашение.";
  if (!consents.communityRules) {
    errors.communityRulesAccepted = "Примите правила сообщества.";
  }
  if (!consents.privacy) errors.privacyAccepted = "Примите политику конфиденциальности.";
  if (!consents.personalDataPolicy) {
    errors.personalDataPolicyAccepted = "Примите политику обработки персональных данных.";
  }
  if (!consents.personalDataConsent) {
    errors.personalDataConsentAccepted = "Дайте согласие на обработку персональных данных.";
  }
  if (!consents.personalDataDistributionConsent) {
    errors.personalDataDistributionConsentAccepted =
      "Подтвердите согласие на распространение публичных материалов.";
  }
  if (!consents.emailNotifications) {
    errors.emailNotificationsAccepted = "Разрешите сервисные email-уведомления.";
  }

  return Object.keys(errors).length > 0
    ? { errors }
    : { data: { username, email, password, consents }, errors };
}

export function validateLogin(formData: FormData): ValidationResult<{
  identifier: string;
  password: string;
}> {
  const identifier = valueOf(formData, "identifier").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const errors: Record<string, string> = {};

  if (!identifier) errors.identifier = "Укажите email или username.";
  else if (identifier.length > 254) errors.identifier = "Слишком длинное значение.";

  if (!password) errors.password = "Укажите пароль.";
  else if (password.length > 128) errors.password = "Пароль слишком длинный.";

  return Object.keys(errors).length > 0 ? { errors } : { data: { identifier, password }, errors };
}

export function validateEmailCode(formData: FormData): ValidationResult<{
  email: string;
  code: string;
}> {
  const email = normalizeEmail(valueOf(formData, "email"));
  const code = valueOf(formData, "code");
  const errors: Record<string, string> = {};

  if (!email || !emailPattern.test(email)) errors.email = "Укажите корректный email.";
  if (!/^\d{6}$/.test(code)) errors.code = "Введите шестизначный код.";

  return Object.keys(errors).length > 0 ? { errors } : { data: { email, code }, errors };
}

export function validatePasswordReset(formData: FormData): ValidationResult<{
  email: string;
  code: string;
  password: string;
}> {
  const base = validateEmailCode(formData);
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const errors = { ...base.errors };

  if (!password) errors.password = "Укажите новый пароль.";
  else if (password.length < 8) errors.password = "Пароль должен быть не короче 8 символов.";
  else if (password.length > 128) errors.password = "Пароль слишком длинный.";

  if (password !== passwordConfirmation) {
    errors.passwordConfirmation = "Пароли не совпадают.";
  }

  return Object.keys(errors).length > 0
    ? { errors }
    : { data: { email: base.data!.email, code: base.data!.code, password }, errors };
}
