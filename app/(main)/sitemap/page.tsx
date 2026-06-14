import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CircleHelp,
  Crown,
  FileText,
  Home,
  Map,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquarePen,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: "Карта сайта",
  description: "Основные разделы и служебные страницы сайта Тёмная Каста.",
  alternates: {
    canonical: "/sitemap",
  },
};

const sections = [
  {
    title: "Лента и поиск",
    description: "Публичные разделы с публикациями и навигацией по контенту.",
    items: [
      { title: "Главная", href: "/", icon: Home },
      { title: "Новое", href: "/new", icon: Sparkles },
      { title: "Популярное", href: "/popular", icon: Newspaper },
      { title: "Поиск", href: "/search", icon: Search },
    ],
  },
  {
    title: "Аккаунт и сообщество",
    description: "Разделы для профиля, подписок, уведомлений и личных настроек.",
    items: [
      { title: "Мой профиль", href: "/profile", icon: UserRound },
      { title: "Подписки", href: "/feed/following", icon: Newspaper },
      { title: "Уведомления", href: "/notifications", icon: Bell },
      { title: "Настройки", href: "/settings", icon: Settings },
      { title: "Создать пост", href: "/create", icon: SquarePen },
      { title: "Premium", href: "/premium", icon: Crown },
    ],
  },
  {
    title: "Помощь и правила",
    description: "Справочные страницы, контакты и документы проекта.",
    items: [
      { title: "Помощь", href: "/help", icon: CircleHelp },
      { title: "Правовая информация", href: "/legal", icon: FileText },
      { title: "Правила сообщества", href: "/community-rules", icon: ShieldCheck },
      { title: "Контакты", href: "/contacts", icon: Map },
    ],
  },
  {
    title: "Документы",
    description: "Юридические страницы и согласия для пользователей сайта.",
    items: [
      { title: LEGAL_DOCUMENTS.terms.title, href: LEGAL_DOCUMENTS.terms.href, icon: FileText },
      { title: LEGAL_DOCUMENTS.privacy.title, href: LEGAL_DOCUMENTS.privacy.href, icon: FileText },
      {
        title: LEGAL_DOCUMENTS.personalData.title,
        href: LEGAL_DOCUMENTS.personalData.href,
        icon: FileText,
      },
      {
        title: LEGAL_DOCUMENTS.personalDataConsent.title,
        href: LEGAL_DOCUMENTS.personalDataConsent.href,
        icon: FileText,
      },
      {
        title: LEGAL_DOCUMENTS.personalDataDistributionConsent.title,
        href: LEGAL_DOCUMENTS.personalDataDistributionConsent.href,
        icon: FileText,
      },
      {
        title: LEGAL_DOCUMENTS.emailNotifications.title,
        href: LEGAL_DOCUMENTS.emailNotifications.href,
        icon: FileText,
      },
      {
        title: LEGAL_DOCUMENTS.personalDataOperator.title,
        href: LEGAL_DOCUMENTS.personalDataOperator.href,
        icon: FileText,
      },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Карта сайта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Основные разделы {projectConfig.name} собраны здесь. XML-карта для поисковых систем
            доступна по адресу{" "}
            <Link href="/sitemap.xml" className="text-primary underline-offset-4 hover:underline">
              /sitemap.xml
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <div>
              <p className="tk-kicker">{section.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="tk-link-card flex min-h-24 gap-3 p-4"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">{item.href}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
