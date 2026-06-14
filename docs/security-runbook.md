# Security runbook

## Production baseline

Текущий production размещается на Vercel, а рабочая PostgreSQL-база — в Neon. Cloudflare,
Cloudflare Tunnel, локальный Windows-хост и порт `3000` не являются текущим публичным production
контуром.

Production-секреты должны храниться только в Vercel environment variables. Строки подключения Neon,
SMTP-пароли, ключи и токены нельзя коммитить в репозиторий или включать в документацию.

Для production на Vercel используются:

```dotenv
APP_URL="https://www.temnayakasta120.ru"
TRUST_PROXY="true"
ENABLE_HSTS="true"
```

Значения должны быть сверены с фактическими настройками проекта Vercel. Не следует фиксировать IP
Vercel или Neon как постоянный: для платформенной инфраструктуры указываются провайдеры и домены.

## CI and deployment checks

```powershell
npm run env:check
npm run lint
npm run build
npm run security:audit
npm run security:audit:high
npm run security:tools
```

Эти команды должны выполняться в Vercel/CI после push. Локальный запуск не требуется для
документарных правок.

`npm run security:tools` не сканирует проект сам. Он только показывает, установлены ли optional tools: gitleaks, semgrep, snyk и trivy.

## Backups

Backups, dumps and project archives must not be placed under `public` and must not be committed. The project root `.gitignore` ignores `backups`, but production backups should still live outside the public app root when possible.

Recommended policy:

- keep database dumps outside `public` and outside web-served directories;
- encrypt archives containing `.env`, dumps, user content or logs;
- use retention, for example daily 7 days, weekly 4 weeks, monthly 3 months;
- test restore into a separate database, never over the live DB without approval;
- do not delete or move existing real backups without explicit owner approval.

## Optional controls

These require separate approval and infrastructure work:

- проверка HTTPS и редиректов всех публичных доменов на основной canonical-домен;
- проверка настроек доверенных proxy-заголовков в Vercel;
- platform/WAF/rate-limit controls, доступные в используемом тарифе Vercel;
- HSTS enablement;
- database cleanup jobs and indexes for long-term view/rate-limit retention;
- major dependency upgrades.
