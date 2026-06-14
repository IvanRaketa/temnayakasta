import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UserList } from "@/components/social/user-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FollowingPageProps {
  params: Promise<{ username: string }>;
}

export const metadata: Metadata = {
  title: "Подписки",
  description: "Список авторов, на которых подписан пользователь.",
};

async function getFollowingSet(currentUserId?: string) {
  if (!currentUserId) return new Set<string>();

  const follows = await db.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });

  return new Set(follows.map((follow) => follow.followingId));
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { username } = await params;
  const current = await getCurrentSessionReadOnly();
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
      following: {
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                  bio: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const followingSet = await getFollowingSet(current?.user.id);
  const users = user.following.map((follow) => ({
    ...follow.following,
    isFollowing: followingSet.has(follow.following.id),
  }));
  const title = user.profile?.displayName || user.username;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="break-words text-2xl font-semibold text-foreground">Подписки</h1>
          <p className="break-words text-sm text-muted-foreground">{title}</p>
        </div>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href={`/profile/${user.username}`}>
            <ArrowLeft className="size-4" />
            Профиль
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{users.length} подписок</CardTitle>
        </CardHeader>
        <CardContent>
          <UserList
            users={users}
            currentUserId={current?.user.id}
            isAuthenticated={Boolean(current)}
            isVerified={Boolean(current?.user.emailVerified)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
