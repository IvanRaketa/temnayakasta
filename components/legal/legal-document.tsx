import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="break-words text-2xl leading-tight">{title}</CardTitle>
        </CardHeader>
        {description ? (
          <CardContent>
            <p className="break-words text-sm leading-6 text-muted-foreground">{description}</p>
          </CardContent>
        ) : null}
      </Card>
      <Card>
        <CardContent className="legal-copy space-y-5 break-words p-5 text-sm leading-7 text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
