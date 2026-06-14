import Link from "next/link";

import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { projectConfig } from "@/lib/project";

export function Footer() {
  return (
    <footer className="px-4 pb-24 pt-6 md:px-6 md:pb-6">
      <div className="tk-glass mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-lg p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-foreground">{projectConfig.name}</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/help" className="hover:text-primary">
            Помощь
          </Link>
          <Link href="/legal" className="hover:text-primary">
            Правовая информация
          </Link>
          <Link href="/sitemap" className="hover:text-primary">
            Карта сайта
          </Link>
          <Link href={LEGAL_DOCUMENTS.terms.href} className="hover:text-primary">
            Пользовательское соглашение
          </Link>
          <Link href={LEGAL_DOCUMENTS.privacy.href} className="hover:text-primary">
            Политика конфиденциальности
          </Link>
          <Link href={LEGAL_DOCUMENTS.personalData.href} className="hover:text-primary">
            Политика ПД
          </Link>
          <Link href={LEGAL_DOCUMENTS.personalDataConsent.href} className="hover:text-primary">
            Согласие на обработку ПД
          </Link>
          <Link
            href={LEGAL_DOCUMENTS.personalDataDistributionConsent.href}
            className="hover:text-primary"
          >
            Согласие на распространение ПД
          </Link>
          <Link href={LEGAL_DOCUMENTS.communityRules.href} className="hover:text-primary">
            Правила сообщества
          </Link>
          <Link href={LEGAL_DOCUMENTS.emailNotifications.href} className="hover:text-primary">
            Email-согласие
          </Link>
          <Link href={LEGAL_DOCUMENTS.personalDataOperator.href} className="hover:text-primary">
            Оператор ПД
          </Link>
          <Link href="/contacts" className="hover:text-primary">
            Контакты
          </Link>
          <span>
            {projectConfig.domains
              .filter((domain) => !domain.startsWith("www."))
              .join(" / ")}
          </span>
        </nav>
      </div>
    </footer>
  );
}
