# Security runbook

## Direct-host baseline

Текущий production-режим — direct-host: Next.js слушает `0.0.0.0:3000`. Это accepted deployment choice, но не полноценная perimeter-защита.

Без доверенного reverse proxy оставляйте:

```dotenv
TRUST_PROXY="false"
ENABLE_HSTS="false"
```

`TRUST_PROXY="true"` допустим только после настройки proxy/CDN, который перезаписывает proxy headers, а не просто передаёт пользовательские `X-Forwarded-For`, `X-Real-IP` или `CF-Connecting-IP`.

## Manual Windows checks

```powershell
npm run env:check
npm run lint
npm run build
npm run security:audit
npm run security:audit:high
npm run security:tools
Get-NetTCPConnection -State Listen -LocalPort 3000
Get-NetFirewallRule | Where-Object DisplayName -like "*3000*"
```

`npm run security:tools` не сканирует проект сам. Он только показывает, установлены ли optional tools: gitleaks, semgrep, snyk и trivy.

## Backups

Backups, dumps and project archives must not be placed under `public` and must not be committed. The project root `.gitignore` ignores `backups`, but production backups should still live outside the public app root when possible.

Recommended policy:

- keep database dumps outside `public` and outside web-served directories;
- encrypt archives containing `.env`, dumps, user content or logs;
- use retention, for example daily 7 days, weekly 4 weeks, monthly 3 months;
- test restore into a separate database, never over the live DB without approval;
- do not delete or move existing real backups without explicit owner approval.

## Optional future controls

These require separate approval and infrastructure work:

- HTTPS and reverse proxy in front of `0.0.0.0:3000`;
- Windows Firewall tightening or network ACL changes;
- Cloudflare, WAF managed rules, bot/rate-limit rules;
- HSTS enablement;
- database cleanup jobs and indexes for long-term view/rate-limit retention;
- major dependency upgrades.
