import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/moderation/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Логи модерации" };

function maskIp(ip: string) {
  if (ip === "direct" || ip === "unknown") {
    return ip;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const [a, b] = ip.split(".");
    return `${a}.${b}.x.x`;
  }

  if (ip.includes(":")) {
    return `${ip.split(":").slice(0, 2).join(":")}:…`;
  }

  return "masked";
}

export default async function ModerationLogsPage() {
  const current = await requireModerator();
  const canSeeFullIp = isAdmin(current.user);
  const [securityEvents, auditLogs] = await Promise.all([
    db.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>SecurityEvent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityEvents.map((event) => (
            <div key={event.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{event.severity}</Badge>
                <span>{event.type}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {canSeeFullIp ? event.ip : maskIp(event.ip)} · {event.createdAt.toISOString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AuditLog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-border p-3 text-sm">
              <p className="break-words">{log.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canSeeFullIp ? log.ip : maskIp(log.ip)} · {log.createdAt.toISOString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
