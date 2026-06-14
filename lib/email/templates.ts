import { projectConfig } from "@/lib/project";

interface TemplateInput {
  code: string;
  actionUrl: string;
  userLabel?: string;
}

interface SecurityWarningInput {
  title: string;
  message: string;
  actionUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function baseTemplate(title: string, body: string, actionUrl: string, actionLabel: string): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#05070d;color:#f7f7f2;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070d;background-image:radial-gradient(circle at 18% 12%,rgba(250,181,31,.16),transparent 30%),radial-gradient(circle at 82% 8%,rgba(97,227,255,.14),transparent 34%),linear-gradient(180deg,#05070d,#090c14);padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:rgba(18,24,36,.92);border:1px solid rgba(126,231,255,.28);border-radius:14px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.38),0 0 48px rgba(97,227,255,.08);">
            <tr>
              <td style="padding:24px 24px 10px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0));">
                <div style="display:inline-block;border:1px solid rgba(250,181,31,.55);border-radius:9px;padding:8px 11px;color:#fab51f;font-weight:800;letter-spacing:.08em;background:rgba(250,181,31,.09);box-shadow:0 0 22px rgba(250,181,31,.14);">ТК</div>
                <div style="margin-top:14px;font-size:20px;font-weight:800;letter-spacing:.01em;color:#ffffff;">${projectConfig.name}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 26px;">
                <h1 style="font-size:25px;line-height:1.25;margin:0 0 16px;color:#ffffff;">${title}</h1>
                ${body}
                <p style="margin:24px 0 0;">
                  <a href="${actionUrl}" style="display:inline-block;background:#fab51f;color:#06070c;text-decoration:none;font-weight:800;padding:13px 18px;border-radius:9px;box-shadow:0 12px 28px rgba(250,181,31,.22);">${actionLabel}</a>
                </p>
                <p style="margin:24px 0 0;color:#91a3b8;font-size:12px;line-height:1.6;">Если кнопка не открывается, скопируйте ссылку: ${actionUrl}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#607186;font-size:12px;line-height:1.6;">Это сервисное письмо ${projectConfig.name}.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="letter-spacing:8px;font-size:32px;font-weight:900;background:linear-gradient(135deg,rgba(250,181,31,.12),rgba(97,227,255,.08));border:1px solid rgba(250,181,31,.5);border-radius:12px;padding:17px 18px;text-align:center;color:#fab51f;margin:18px 0;box-shadow:inset 0 0 28px rgba(97,227,255,.08),0 0 30px rgba(250,181,31,.12);">${code}</div>`;
}

export function emailVerificationTemplate(input: TemplateInput): EmailTemplate {
  const subject = "Подтверждение почты в Тёмной Касте";
  const html = baseTemplate(
    subject,
    `<p style="line-height:1.7;color:#c6d3e2;margin:0;">Введите код подтверждения в интерфейсе Тёмной Касты.</p>${codeBlock(input.code)}<p style="line-height:1.7;color:#91a3b8;margin:0;">Код действует 15 минут.</p>`,
    input.actionUrl,
    "Подтвердить почту",
  );
  return {
    subject,
    html,
    text: `Тёмная Каста\nКод подтверждения почты: ${input.code}\nКод действует 15 минут.\n${input.actionUrl}`,
  };
}

export function passwordResetTemplate(input: TemplateInput): EmailTemplate {
  const subject = "Сброс пароля в Тёмной Касте";
  const html = baseTemplate(
    subject,
    `<p style="line-height:1.7;color:#c6d3e2;margin:0;">Введите этот код, чтобы установить новый пароль.</p>${codeBlock(input.code)}<p style="line-height:1.7;color:#91a3b8;margin:0;">Если вы не запрашивали сброс, просто проигнорируйте письмо.</p>`,
    input.actionUrl,
    "Сбросить пароль",
  );
  return {
    subject,
    html,
    text: `Тёмная Каста\nКод сброса пароля: ${input.code}\nКод действует 15 минут.\n${input.actionUrl}`,
  };
}

export function emailChangeTemplate(input: TemplateInput): EmailTemplate {
  const subject = "Смена email в Тёмной Касте";
  const html = baseTemplate(
    subject,
    `<p style="line-height:1.7;color:#c6d3e2;margin:0;">Введите код, чтобы подтвердить новый email.</p>${codeBlock(input.code)}`,
    input.actionUrl,
    "Подтвердить email",
  );
  return {
    subject,
    html,
    text: `Тёмная Каста\nКод смены email: ${input.code}\n${input.actionUrl}`,
  };
}

export function securityWarningTemplate(input: SecurityWarningInput): EmailTemplate {
  const html = baseTemplate(
    input.title,
    `<p style="line-height:1.7;color:#c6d3e2;margin:0;">${input.message}</p>`,
    input.actionUrl,
    "Открыть безопасность аккаунта",
  );
  return {
    subject: input.title,
    html,
    text: `Тёмная Каста\n${input.title}\n${input.message}\n${input.actionUrl}`,
  };
}
