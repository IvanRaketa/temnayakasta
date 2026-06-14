# Legacy: локальный Windows 11 + PostgreSQL runbook

> Этот документ описывает только архивный локальный сценарий разработки и тестирования.
> Текущий production размещается на Vercel, рабочая PostgreSQL-база — в Neon. Документ не
> является инструкцией по эксплуатации production.

Проект запускается с личного ПК на Windows 11 без Docker. Локальный сценарий:

- Next.js / React / TypeScript;
- Prisma 7;
- обычный PostgreSQL;
- dev и build через webpack;
- `.env` хранится локально и не коммитится;
- локальный тестовый доступ в этом legacy-сценарии может идти через `0.0.0.0:3000`;
- будущий HTTPS/reverse proxy или Cloudflare/WAF требуют отдельного инфраструктурного решения.

## 1. Установить PostgreSQL

1. Установите PostgreSQL 16 или 17 для Windows.
2. Во время установки включите PostgreSQL Server и Command Line Tools.
3. Если `psql` не найден, добавьте в PATH:

```powershell
C:\Program Files\PostgreSQL\16\bin
```

Проверка:

```powershell
psql --version
Test-NetConnection 127.0.0.1 -Port 5432
```

Создайте базу, если ее еще нет:

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

Внутри `psql`:

```sql
CREATE DATABASE temnaya_kasta;
```

## 2. Настроить `.env`

Скопируйте `.env.example` в `.env` и заполните реальные локальные значения. Не удаляйте существующий `.env`, если он уже настроен.

Минимум для запуска:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/temnaya_kasta?schema=public"
APP_URL="http://localhost:3000"
```

Сгенерируйте стабильный ключ Server Actions. Он должен быть в `.env` до production-сборки:

```powershell
npm run env:server-action-key
```

Проверить наличие обязательных переменных:

```powershell
npm run env:check
```

Проверить подключение к базе вручную:

```powershell
psql "$env:DATABASE_URL" -c "select current_database(), current_user;"
```

Если PowerShell не подставляет переменную из `.env`, временно задайте ее в терминале:

```powershell
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/temnaya_kasta?schema=public"
psql "$env:DATABASE_URL" -c "select current_database(), current_user;"
```

## 3. Prisma

```powershell
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
```

Seed не запускается автоматически и теперь требует явного разрешения. Для локального тестового seed:

```powershell
$env:ALLOW_DATABASE_SEED="true"
$env:SEED_PASSWORD="Use-A-Strong-Local-Password-Only"
npm run prisma:seed
```

Seed создаёт локальные тестовые аккаунты администратора, модератора и пользователя с паролем из `SEED_PASSWORD`. В production seed запрещён без дополнительного `ALLOW_PRODUCTION_SEED="true"` и отдельного подтверждения владельца.

Не запускайте seed против живой базы.

## 4. Запуск через webpack

Dev:

```powershell
npm run dev
```

Dev для доступа с другого устройства в локальной сети:

```powershell
npm run dev:host
```

Production build:

```powershell
npm run build
npm run start
```

В Next.js 16 Turbopack включен по умолчанию, поэтому scripts явно используют `--webpack`.

## 5. SMTP и подтверждение почты

Для реальной отправки кодов подтверждения заполните:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_FROM="Temnaya Kasta <no-reply@example.com>"
```

Проверить SMTP-соединение:

```powershell
npm run smtp:check
```

Отправить тестовое письмо:

```powershell
$env:SMTP_TEST_TO="your-email@example.com"
npm run smtp:check
```

Если SMTP не заполнен, регистрация создаст код в таблице `VerificationCode`, но письмо не уйдет. Для открытия сайта наружу SMTP должен быть настроен.

Проверить последние коды в базе:

```powershell
psql "$env:DATABASE_URL" -c 'select email, type, "expiresAt", "usedAt", "createdAt" from "VerificationCode" order by "createdAt" desc limit 5;'
```

## 6. Clean и size

Посмотреть вес проекта:

```powershell
npm run size
```

Безопасно удалить локальные кэши и сборочные артефакты:

```powershell
npm run clean
```

`clean` удаляет только явно перечисленные локальные артефакты внутри корня проекта:

- `.next`;
- `.pglite`;
- `.turbo`;
- `.parcel-cache`;
- `out`;
- `dist`;
- `coverage`;
- корневые `*.log`;
- корневые `*.tsbuildinfo`.

`clean` не удаляет исходный код, Prisma schema, миграции, `public/uploads`, документы и `.env`.

## 7. Админка и модераторка

Админка:

```text
http://localhost:3000/admin
```

Модераторка:

```text
http://localhost:3000/moderation
```

Права:

- `USER`: обычный пользователь;
- `MODERATOR`: доступ к модераторке, жалобам, очереди контента, статусам пользователей;
- `ADMIN`: доступ к админке, смене ролей, статусов пользователей, управлению постами, комментариями и жалобами.

Обычный пользователь не видит и не может выполнить admin/moderation server actions. Неподтвержденная почта блокирует опасные действия.

## 8. Что не используется

Docker не является частью локального запуска. `docker-compose.yml` удален из проекта, чтобы сценарий разработки не уводил в Docker.
