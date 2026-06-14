import "dotenv/config";

const aesKeyLengths = new Set([16, 24, 32]);

const checks = [
  ["DATABASE_URL", process.env.DATABASE_URL, true],
  ["APP_URL", process.env.APP_URL, true],
  ["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY, true],
  ["TRUST_PROXY", process.env.TRUST_PROXY, false],
  ["ENABLE_HSTS", process.env.ENABLE_HSTS, false],
  ["VERIFICATION_CODE_PEPPER", process.env.VERIFICATION_CODE_PEPPER, false],
  ["SMTP_HOST", process.env.SMTP_HOST, false],
  ["SMTP_FROM", process.env.SMTP_FROM, false],
];

let failed = false;

function validateServerActionsKey(value) {
  if (!value || !value.trim()) return null;

  const normalized = value.trim();

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    return "must be a base64-encoded AES key";
  }

  const bytes = Buffer.from(normalized, "base64");

  if (bytes.toString("base64") !== normalized) {
    return "must be canonical base64";
  }

  if (!aesKeyLengths.has(bytes.length)) {
    return "must decode to 16, 24, or 32 bytes";
  }

  return null;
}

for (const [name, value, required] of checks) {
  const present = Boolean(value && value.trim());
  const validationError =
    name === "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" && present
      ? validateServerActionsKey(value)
      : null;
  const booleanError =
    (name === "TRUST_PROXY" || name === "ENABLE_HSTS") &&
    present &&
    value !== "true" &&
    value !== "false"
      ? 'must be "true" or "false"'
      : null;

  console.log(
    `${validationError || booleanError ? "invalid" : present ? "ok" : required ? "missing" : "empty"} ${name}`,
  );

  if (required && !present) failed = true;
  if (validationError) {
    console.error(
      `${name} ${validationError}. Run \`npm run env:server-action-key\` to generate one.`,
    );
    failed = true;
  }
  if (booleanError) {
    console.error(`${name} ${booleanError}.`);
    failed = true;
  }
}

if (!process.env.VERIFICATION_CODE_PEPPER?.trim()) {
  console.warn(
    "warning VERIFICATION_CODE_PEPPER is empty; verification codes will use NEXT_SERVER_ACTIONS_ENCRYPTION_KEY as the HMAC secret.",
  );
}

if (failed) {
  console.error("Required environment variables are missing. Check .env in the project root.");
  process.exit(1);
}
