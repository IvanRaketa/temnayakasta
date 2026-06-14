import "dotenv/config";
import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_FROM"];
const missing = required.filter((name) => !process.env[name]);
const testTo = process.argv[2] || process.env.SMTP_TEST_TO;

if (missing.length > 0) {
  console.log(`SMTP is not configured. Missing: ${missing.join(", ")}`);
  process.exit(0);
}

const port = Number(process.env.SMTP_PORT ?? 587);
const secure =
  process.env.SMTP_SECURE === undefined || process.env.SMTP_SECURE === ""
    ? port === 465
    : process.env.SMTP_SECURE === "true";

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`SMTP check failed: invalid SMTP_PORT "${process.env.SMTP_PORT}"`);
  process.exit(1);
}

if (process.env.SMTP_USER && !process.env.SMTP_PASSWORD) {
  console.error("SMTP check failed: SMTP_USER is set but SMTP_PASSWORD is empty");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

try {
  await transporter.verify();
  console.log(`SMTP connection verified (${process.env.SMTP_HOST}:${port}, secure=${secure})`);

  if (testTo) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: testTo,
      subject: "Temnaya Kasta SMTP check",
      text: "SMTP check passed.",
    });
    console.log(`Test email sent to ${testTo}`);
  }
} catch (error) {
  const password = process.env.SMTP_PASSWORD;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = password ? rawMessage.replaceAll(password, "[redacted]") : rawMessage;
  console.error(
    `SMTP check failed: ${error.code ?? "ERROR"}${error.command ? ` command=${error.command}` : ""}${error.responseCode ? ` responseCode=${error.responseCode}` : ""} ${message}`,
  );
  process.exit(1);
}
