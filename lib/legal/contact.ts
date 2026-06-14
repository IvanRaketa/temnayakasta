import { LEGAL_OPERATOR } from "@/lib/legal/operator";

const emailPattern = /[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/;

export function extractEmail(value: string | undefined) {
  if (!value) return null;

  const match = value.match(emailPattern);
  return match?.[0] ?? null;
}

export function getProjectContactEmail() {
  return (
    LEGAL_OPERATOR.email ??
    extractEmail(process.env.LEGAL_OPERATOR_EMAIL) ??
    extractEmail(process.env.SMTP_FROM) ??
    extractEmail(process.env.SMTP_USER)
  );
}
