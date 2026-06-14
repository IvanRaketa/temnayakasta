import type { Metadata } from "next";
import Link from "next/link";

import { updateUserStatusAction } from "@/app/(main)/moderation/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/moderation/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Пользователи модерации" };

function StatusButton({ userId, status, label }: { userId: string; status: string; label: string }) {
  return (
    <form action={updateUserStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="secondary">{label}</Button>
    </form>
  );
}

export default async function ModerationUsersPage() {
  await requireModerator();
  const users = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { id: true, username: true, emailVerified: true, status: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Пользователи</h1>
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
              <Link className="break-words font-medium text-primary hover:underline" href={`/profile/${user.username}`}>@{user.username}</Link>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>{user.status}</Badge>
                <Badge variant="outline">{user.role}</Badge>
                <span className="text-muted-foreground">{user.emailVerified ? "email ok" : "email unverified"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusButton userId={user.id} status="ACTIVE" label="ACTIVE" />
              <StatusButton userId={user.id} status="LIMITED" label="LIMITED" />
              <StatusButton userId={user.id} status="MUTED" label="MUTED" />
              <StatusButton userId={user.id} status="BANNED" label="BANNED" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
