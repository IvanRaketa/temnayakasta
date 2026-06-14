"use client";

import type { ComponentType } from "react";
import { BookOpen, FileText, PenLine, Radio } from "lucide-react";

import { PresenceProvider, usePresence } from "@/components/presence/presence-provider";
import { cn } from "@/lib/utils";

function PulseMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="tk-metric-card min-h-24 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function PulseContent() {
  const presence = usePresence();
  const pulse = presence?.snapshot?.pulse;

  return (
    <section className="tk-glass tk-panel rounded-lg p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="tk-kicker">Пульс Тёмной Касты</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Живой онлайн</h2>
        </div>
        <span
          className={cn(
            "tk-pill",
            pulse && "text-foreground",
          )}
        >
          <span className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(246,205,96,0.15)]" />
          live
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PulseMetric label="Пользователей онлайн" value={pulse?.usersOnline ?? 0} icon={Radio} />
        <PulseMetric label="Активных авторов" value={pulse?.activeAuthors ?? 0} icon={PenLine} />
        <PulseMetric label="Активных читателей" value={pulse?.activeReaders ?? 0} icon={BookOpen} />
        <PulseMetric label="Открытых постов" value={pulse?.openPosts ?? 0} icon={FileText} />
      </div>
    </section>
  );
}

export function HomePresencePulse() {
  return (
    <PresenceProvider scope="site" initialActivity="online">
      <PulseContent />
    </PresenceProvider>
  );
}
