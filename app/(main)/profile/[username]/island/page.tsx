import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  Eye,
  FileText,
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { BackButton } from "@/components/navigation/back-button";
import { PremiumName } from "@/components/premium/premium-name";
import { ProfilePresenceCounter } from "@/components/presence/page-presence";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { IslandMap } from "@/components/profile/island-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { UserRole, UserStatus } from "@/lib/generated/prisma/client";
import { getProfileIsland, type IslandAchievement } from "@/lib/profile/island";
import { recordProfileView } from "@/lib/profile/views";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface IslandPageProps {
  params: Promise<{ username: string }>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function roleLabel(role: UserRole) {
  if (role === UserRole.ADMIN) return "Admin";
  if (role === UserRole.MODERATOR) return "Moderator";

  return "User";
}

function AchievementItem({ achievement }: { achievement: IslandAchievement }) {
  return (
    <div className={cn("tk-link-card p-3", !achievement.unlocked && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md border border-border",
            achievement.unlocked
              ? "bg-primary/15 text-primary shadow-[0_0_18px_rgba(246,205,96,0.14)]"
              : "bg-secondary text-muted-foreground",
          )}
        >
          <Award className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{achievement.title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{achievement.description}</p>
          {achievement.unlockedAt ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Открыто {formatDate(achievement.unlockedAt)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="tk-metric-card min-h-28 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

export async function generateMetadata({ params }: IslandPageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `Остров @${username}`,
    description: `Личный остров автора @${username}: уровень, опыт, достижения и статистика.`,
  };
}

export default async function IslandPage({ params }: IslandPageProps) {
  const { username } = await params;
  const current = await getCurrentSessionReadOnly();
  const island = await getProfileIsland(username);

  if (!island) {
    notFound();
  }

  const { user, stats, achievements, premiumActive } = island;
  const isOwner = current?.user.id === user.id;
  const isBanned = user.status === UserStatus.BANNED;
  const displayName = user.deletedAt
    ? "Удалённый пользователь"
    : isBanned
      ? "Заблокированный пользователь"
      : user.profile?.displayName || user.username;
  const avatar = user.profile?.avatar || user.avatar;

  if (!isOwner && !user.deletedAt && !isBanned) {
    await recordProfileView({
      profileUserId: user.id,
      viewerId: current?.user.id,
      headers: await headers(),
    });
  }

  if (user.deletedAt || isBanned) {
    return (
      <div className="space-y-5">
        <BackButton />
        <Card>
          <CardHeader>
            <CardTitle>Остров скрыт</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Личный остров недоступен для этого профиля.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <PresenceProvider scope="profile" targetId={user.id} initialActivity="viewing_profile">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton />
          <Button asChild variant="secondary">
            <Link href={`/profile/${user.username}`}>
              <ArrowLeft className="size-4" />
              Профиль
            </Link>
          </Button>
        </div>

        <section
          className={cn(
            "tk-glass-strong tk-panel rounded-lg p-5 md:p-8",
            premiumActive && "tk-island-accent",
          )}
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.92fr)_minmax(32rem,1.08fr)]">
            <div className="flex min-w-0 max-w-3xl flex-col justify-center">
              <div className="tk-kicker">
                <Sparkles className="size-3.5" />
                Личный остров
              </div>
              <div className="mt-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="tk-avatar-ring grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-2xl font-semibold text-secondary-foreground">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="size-full object-cover" />
                  ) : (
                    displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="max-w-[14ch] break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl xl:text-[2.7rem]">
                      <PremiumName user={user}>{displayName}</PremiumName>
                    </h1>
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              {user.profile?.bio ? (
                <p className="mt-5 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                  {user.profile.bio}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <ProfilePresenceCounter />
                <span className="tk-pill">
                  <Shield className="size-3.5 text-primary" />
                  Роль: <span className="font-semibold text-foreground">{roleLabel(user.role)}</span>
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <IslandMap stats={stats} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Star className="size-5 text-primary" />
                Уровень {stats.level}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-3xl font-semibold text-foreground">
                    {formatNumber(stats.xp)} XP
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    До уровня {stats.level + 1}: {" "}
                    {formatNumber(Math.max(0, stats.nextLevelXp - stats.xp))} XP
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.levelProgressPercent}% прогресса
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${stats.levelProgressPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <BadgeCheck className="size-5 text-primary" />
                Достижения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">
                {unlockedAchievements}/{achievements.length}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Открыто на личном острове.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Просмотры"
            value={formatNumber(stats.totalViews)}
            icon={<Eye className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Подписчики"
            value={formatNumber(stats.followers)}
            icon={<Users className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Публикации"
            value={formatNumber(stats.publishedPosts)}
            icon={<FileText className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Комментарии"
            value={formatNumber(stats.comments)}
            icon={<MessageSquare className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Лайки"
            value={formatNumber(stats.receivedLikes)}
            icon={<Heart className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Регистрация"
            value={formatDate(user.createdAt)}
            icon={<CalendarDays className="size-3.5 text-primary" />}
          />
          <StatCard
            label="Роль"
            value={roleLabel(user.role)}
            icon={<Shield className="size-3.5 text-primary" />}
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Коллекция достижений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {achievements.map((achievement) => (
                <AchievementItem key={achievement.code} achievement={achievement} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PresenceProvider>
  );
}
