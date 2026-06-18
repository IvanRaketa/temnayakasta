# Security runbook

## Production baseline

Текущий production размещается на self-hosted/домашнем сервере оператора. Рабочая PostgreSQL-база размещается на инфраструктуре оператора. Vercel и Neon не являются текущим production-контуром.

Production-секреты должны храниться только на сервере. Строки подключения к базе, SMTP-пароли, ключи и токены нельзя коммитить в репозиторий или включать в документацию.

Для self-hosted production основной публичный адрес: `https://temnayakasta120.ru`. Дополнительный домен `temnayakasta120.online` должен открывать тот же сайт после настройки DNS.

Доверие к proxy-заголовкам можно включать только после настройки доверенного reverse proxy. Строгие HTTPS-настройки можно включать только после проверки HTTPS на всех production-доменах.

Не следует фиксировать приватный IP, домашнюю сеть или внутренние пути в публичной документации. Для публичных материалов используются домены и общее описание инфраструктуры.

## Local/server checks

Перед реальным запуском production нужно выполнить проверки на сервере вручную:

1. установить зависимости;
2. проверить конфигурацию окружения;
3. проверить Prisma schema;
4. сгенерировать Prisma client;
5. применить миграции;
6. собрать production build;
7. запустить production server;
8. проверить оба домена, авторизацию, регистрацию, почту и юридические страницы.

Документарные правки не требуют запуска сервера.

`npm run security:tools` не сканирует проект сам. Он только показывает, установлены ли optional tools: gitleaks, semgrep, snyk и trivy.

## Backups

Backups, dumps and project archives must not be placed under `public` and must not be committed. The project root `.gitignore` ignores `backups`, but production backups should still live outside the public app root when possible.

Recommended policy:

- keep database dumps outside `public` and outside web-served directories;
- encrypt archives containing server configuration, dumps, user content or logs;
- use retention, for example daily 7 days, weekly 4 weeks, monthly 3 months;
- test restore into a separate database, never over the live DB without approval;
- do not delete or move existing real backups without explicit owner approval.

## Optional controls

These require separate approval and infrastructure work:

- проверка HTTPS и редиректов всех публичных доменов на основной canonical-домен;
- проверка настроек доверенных proxy-заголовков только после подключения reverse proxy;
- firewall/WAF/rate-limit controls, если они фактически используются;
- HSTS enablement после полной проверки HTTPS;
- database cleanup jobs and indexes for long-term view/rate-limit retention;
- major dependency upgrades.
