import nodemailer from "nodemailer";

import type { EmailTemplate } from "@/lib/email/templates";

type SmtpErrorDetails = {
  code?: string;
  command?: string;
  responseCode?: number;
  message: string;
};

export class MailDeliveryError extends Error {
  userMessage: string;
  details: SmtpErrorDetails;

  constructor(userMessage: string, details: SmtpErrorDetails, cause?: unknown) {
    super(details.message);
    this.name = "MailDeliveryError";
    this.userMessage = userMessage;
    this.details = details;
    this.cause = cause;
  }
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export function isMailDeliveryError(error: unknown): error is MailDeliveryError {
  return error instanceof MailDeliveryError;
}

function readSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE === undefined || process.env.SMTP_SECURE === ""
      ? port === 465
      : process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !from) {
    throw new MailDeliveryError("SMTP не настроен: укажите SMTP_HOST и SMTP_FROM.", {
      code: "SMTP_NOT_CONFIGURED",
      message: "SMTP_HOST or SMTP_FROM is missing",
    });
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new MailDeliveryError("SMTP_PORT должен быть числом от 1 до 65535.", {
      code: "SMTP_BAD_PORT",
      message: `Invalid SMTP_PORT: ${process.env.SMTP_PORT}`,
    });
  }

  if (user && !pass) {
    throw new MailDeliveryError("SMTP_USER задан, но SMTP_PASSWORD пустой.", {
      code: "SMTP_PASSWORD_MISSING",
      message: "SMTP_USER is set but SMTP_PASSWORD is missing",
    });
  }

  return {
    host,
    port,
    secure,
    from,
    auth: user ? { user, pass } : undefined,
  };
}

function smtpErrorDetails(error: unknown): SmtpErrorDetails {
  const source = error as {
    code?: unknown;
    command?: unknown;
    responseCode?: unknown;
    message?: unknown;
  };
  const password = process.env.SMTP_PASSWORD;
  const rawMessage = error instanceof Error ? error.message : String(source.message ?? error);
  const message = password ? rawMessage.replaceAll(password, "[redacted]") : rawMessage;

  return {
    code: typeof source.code === "string" ? source.code : undefined,
    command: typeof source.command === "string" ? source.command : undefined,
    responseCode: typeof source.responseCode === "number" ? source.responseCode : undefined,
    message,
  };
}

function logSmtpError(to: string, details: SmtpErrorDetails) {
  console.error("[email] SMTP delivery failed", {
    to,
    code: details.code ?? "ERROR",
    command: details.command,
    responseCode: details.responseCode,
    message: details.message,
  });
}

export async function sendMail(to: string, template: EmailTemplate) {
  const config = readSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    const details = smtpErrorDetails(error);
    logSmtpError(to, details);
    throw new MailDeliveryError(
      "Не удалось отправить письмо. SMTP-ошибка записана в консоль сервера.",
      details,
      error,
    );
  }

  return { sent: true };
}
