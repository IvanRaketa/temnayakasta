import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
const keyName = "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY";
const keyLinePattern = new RegExp(`^\\s*${keyName}\\s*=\\s*(.*)$`, "m");
const force = process.argv.includes("--force");
const validLengths = new Set([16, 24, 32]);

function unquote(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getValidKeyLength(value) {
  if (!value) return null;

  const normalized = value.trim();

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    return null;
  }

  const bytes = Buffer.from(normalized, "base64");

  if (bytes.toString("base64") !== normalized || !validLengths.has(bytes.length)) {
    return null;
  }

  return bytes.length;
}

function upsertKey(contents, key) {
  const eol = contents.includes("\r\n") ? "\r\n" : "\n";
  const nextLine = `${keyName}="${key}"`;

  if (!keyLinePattern.test(contents)) {
    const suffix = contents.length > 0 && !contents.endsWith("\n") ? eol : "";
    return `${contents}${suffix}${nextLine}${eol}`;
  }

  return contents.replace(keyLinePattern, nextLine);
}

let contents = "";

try {
  contents = await readFile(envPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const existingMatch = contents.match(keyLinePattern);
const existingValue = existingMatch ? unquote(existingMatch[1]) : "";
const existingLength = getValidKeyLength(existingValue);

if (existingLength && !force) {
  console.log(`ok ${keyName} already exists (${existingLength}-byte key)`);
  process.exit(0);
}

if (existingMatch && !force) {
  console.error(`${keyName} exists but is not a valid base64 AES key.`);
  console.error("Run `npm run env:server-action-key -- --force` to replace it.");
  process.exit(1);
}

const key = randomBytes(32).toString("base64");
await writeFile(envPath, upsertKey(contents, key), "utf8");

console.log(`${existingMatch ? "rotated" : "generated"} ${keyName} in .env (32-byte key)`);
console.log("Rebuild the app after changing this key: npm run build");
