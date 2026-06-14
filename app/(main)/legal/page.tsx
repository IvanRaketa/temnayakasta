import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { projectConfig } from "@/lib/project";

export const metadata: Metadata = {
  title: { absolute: "Правовая информация — Тёмная Каста" },
  description: "Юридические документы и контакты проекта Тёмная Каста.",
  alternates: { canonical: "/legal" },
};

const links = [
  LEGAL_DOCUMENTS.terms,
  LEGAL_DOCUMENTS.communityRules,
  LEGAL_DOCUMENTS.privacy,
  LEGAL_DOCUMENTS.personalData,
  LEGAL_DOCUMENTS.personalDataConsent,
  LEGAL_DOCUMENTS.personalDataDistributionConsent,
  LEGAL_DOCUMENTS.emailNotifications,
  LEGAL_DOCUMENTS.personalDataOperator,
  { title: "Контакты и юридическая информация", href: "/contacts" },
];

export default function LegalPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Правовая информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Документы относятся к сайту {projectConfig.domains.join(" и ")}. Основной
            canonical-домен: {projectConfig.domain}.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-28 gap-3 rounded-md border border-border bg-card p-4 transition hover:border-ring hover:bg-secondary/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-primary">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block break-words font-medium text-foreground">{item.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{item.href}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
