import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const VERIFICATION_CODE_TTL_MINUTES = 15;
export const VERIFICATION_CODE_RESEND_SECONDS = 60;
export const VERIFICATION_CODE_MAX_ATTEMPTS = 5;

export function createSixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function verificationCodeSecret() {
  const secret =
    process.env.VERIFICATION_CODE_PEPPER ?? process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;

  if (!secret?.trim()) {
    throw new Error(
      "VERIFICATION_CODE_PEPPER or NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be set before creating verification codes.",
    );
  }

  return secret;
}

function codeDigest(code: string, salt: string) {
  return createHmac("sha256", verificationCodeSecret())
    .update(`${salt}:${code.trim()}`)
    .digest("base64url");
}

export function hashVerificationCode(code: string): string {
  const salt = randomBytes(16).toString("base64url");
  return `v2:${salt}:${codeDigest(code, salt)}`;
}

export function verifyVerificationCode(code: string, storedHash: string): boolean {
  const [version, salt, digest] = storedHash.split(":");

  if (version !== "v2" || !salt || !digest) {
    return false;
  }

  const expected = Buffer.from(codeDigest(code, salt));
  const actual = Buffer.from(digest);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getVerificationCodeExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
}

export function getVerificationCodeResendAvailableAt(now = new Date()): Date {
  return new Date(now.getTime() + VERIFICATION_CODE_RESEND_SECONDS * 1000);
}
