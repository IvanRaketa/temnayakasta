import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  CalendarDays,
  Eye,
  FileText,
  Map,
  Pin,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

import { PremiumName } from "@/components/premium/premium-name";
import { PostCard } from "@/components/posts/post-card";
import { ProfilePresenceCounter } from "@/components/presence/page-presence";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { ReportForm } from "@/components/reports/report-form";
import { FollowButton } from "@/components/social/follow-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { PostStatus, UserStatus } from "@/lib/generated/prisma/client";
import { recordProfileView } from "@/lib/profile/views";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

async function getProfile(username: string) {
  return db.user.findUnique({
    where: { username },
    include: {
      profile: true,
      posts: {
        where: {
          status: {
            in: [
              PostStatus.PUBLISHED,
              PostStatus.DRAFT,
              PostStatus.PENDING_REVIEW,
              PostStatus.HIDDEN,
              PostStatus.BLOCKED,
            ],
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: {
          author: {
            select: {
              username: true,
              avatar: true,
              premiumUntil: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                  premiumNameEffect: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              views: true,
            },
          },
          reactions: {
            select: {
              type: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      },
      _count: {
        select: {
          achievements: true,
          followers: true,
          following: true,
        },
      },
    },
  });
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

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  let user: {
    username: string;
    deletedAt: Date | null;
    profile: {
      displayName: string | null;
      bio: string | null;
    } | null;
  } | null;

  try {
    user = await db.user.findUnique({
      where: { username },
      select: {
        username: true,
        deletedAt: true,
        profile: {
          select: {
            displayName: true,
            bio: true,
          },
        },
      },
    });
  } catch (error) {
    console.error(error);
    return { title: "Профиль недоступен" };
  }

  if (!user) {
    return { title: "Профиль не найден" };
  }

  const title = user.deletedAt
    ? "Удалённый пользователь"
    : user.profile?.displayName || user.username;

  return {
    title,
    description: user.deletedAt
      ? "Профиль удалённого пользователя Тёмной Касты."
      : user.profile?.bio || `Профиль автора ${title} в Тёмной Касте.`,
    alternates: {
      canonical: `/profile/${user.username}`,
    },
    openGraph: {
      title,
      description: user.deletedAt
        ? "Профиль удалённого пользователя Тёмной Касты."
        : user.profile?.bio || `Профиль автора ${title} в Тёмной Касте.`,
      url: `/profile/${user.username}`,
      type: "profile",
      siteName: "Тёмная Каста",
    },
  };
}

export default async function AuthorProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const current = await getCurrentSessionReadOnly();
  let user: Awaited<ReturnType<typeof getProfile>>;

  try {
    user = await getProfile(username);
  } catch (error) {
    console.error(error);
    notFound();
  }

  if (!user) {
    notFound();
  }

  const isOwner = user.id === current?.user.id;
  const isFollowing = current
    ? Boolean(
        await db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: current.user.id,
              followingId: user.id,
            },
          },
        }),
      )
    : false;
  const displayName = user.deletedAt
    ? "Удалённый пользователь"
    : user.status === UserStatus.BANNED
      ? "Заблокированный пользователь"
      : user.profile?.displayName || user.username;
  const avatar = user.profile?.avatar || user.avatar;
  const coverImage = user.profile?.coverImage;
  const isBanned = user.status === UserStatus.BANNED;
  const premiumActive = Boolean(user.premiumUntil && user.premiumUntil > new Date());
  const publishedPosts =
    isBanned && !isOwner ? [] : user.posts.filter((post) => post.status === PostStatus.PUBLISHED);
  const draftPosts = isOwner
    ? user.posts.filter((post) => post.status !== PostStatus.PUBLISHED)
    : [];
  const canManagePinnedPost = isOwner && premiumActive;
  const pinnedPost = premiumActive
    ? (publishedPosts.find((post) => post.id === user.profile?.pinnedPostId) ?? null)
    : null;
  const profilePosts = pinnedPost
    ? publishedPosts.filter((post) => post.id !== pinnedPost.id)
    : publishedPosts;
  const totalViews = publishedPosts.reduce((total, post) => total + post._count.views, 0);
  const totalComments = publishedPosts.reduce((total, post) => total + post._count.comments, 0);

  if (!isOwner && !user.deletedAt && !isBanned) {
    await recordProfileView({
      profileUserId: user.id,
      viewerId: current?.user.id,
      headers: await headers(),
    });
  }

  return (
    <PresenceProvider scope="profile" targetId={user.id} initialActivity="viewing_profile">
      <div className="space-y-6">
        <section
          className="tk-glass-strong tk-panel overflow-hidden rounded-lg"
        >
          <div className="relative min-h-44 overflow-hidden border-b border-border/70">
            {coverImage && !user.deletedAt && !isBanned ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="" className="absolute inset-0 size-full object-cover" />
            ) : null}
            <div className="tk-profile-cover absolute inset-0" />
            <div className="tk-profile-cover-grid absolute inset-x-0 bottom-0 h-20" />
          </div>

          <div className="p-5 md:p-6">
            <div className="-mt-16 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="tk-avatar-ring grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border border-background/80 bg-secondary text-2xl font-semibold text-secondary-foreground">
                  {avatar && !user.deletedAt && !isBanned ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="size-full object-cover" />
                  ) : (
                    displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-4xl font-semibold leading-tight text-foreground">
                      <PremiumName user={user}>{displayName}</PremiumName>
                    </h1>
                    {!user.deletedAt && user.status !== UserStatus.ACTIVE ? (
                      <Badge variant="outline">{user.status}</Badge>
                    ) : null}
                  </div>
                  {!user.deletedAt ? (
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  ) : null}
                </div>
              </div>

              {!user.deletedAt && !isBanned ? (
                <div className="flex flex-col gap-2 sm:flex-row lg:pb-1">
                  {isOwner ? (
                    <Button asChild variant="secondary" className="justify-start">
                      <Link href="/settings">
                        <Settings className="size-4" />
                        Настройки
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild className="justify-start">
                    <Link href={`/profile/${user.username}/island`}>
                      <Map className="size-4" />
                      Остров
                    </Link>
                  </Button>
                  <FollowButton
                    targetUserId={user.id}
                    targetUsername={user.username}
                    isAuthenticated={Boolean(current)}
                    isVerified={Boolean(current?.user.emailVerified)}
                    isFollowing={isFollowing}
                    isSelf={isOwner}
                    className="w-full sm:w-auto"
                  />
                </div>
              ) : null}
            </div>

            {!user.deletedAt && !isBanned && user.profile?.bio ? (
              <p className="mt-5 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                {user.profile.bio}
              </p>
            ) : null}
            {!user.deletedAt && !isBanned && user.profile?.statusText ? (
              <p className="tk-pill mt-4 max-w-full break-words text-foreground">
                {user.profile.statusText}
              </p>
            ) : null}

            {!user.deletedAt ? (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Link href={`/profile/${user.username}/followers`} className="tk-link-card p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3.5 text-primary" />
                    Подписчики
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(user._count.followers)}
                  </span>
                </Link>
                <Link href={`/profile/${user.username}/following`} className="tk-link-card p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserCheck className="size-3.5 text-primary" />
                    Подписки
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(user._count.following)}
                  </span>
                </Link>
                <div className="tk-metric-card min-h-24 p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="size-3.5 text-primary" />
                    Посты
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(publishedPosts.length)}
                  </span>
                </div>
                <div className="tk-metric-card min-h-24 p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Eye className="size-3.5 text-primary" />
                    Просмотры
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(totalViews)}
                  </span>
                </div>
                <div className="tk-metric-card min-h-24 p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Award className="size-3.5 text-primary" />
                    Достижения
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(user._count.achievements)}
                  </span>
                </div>
                <div className="tk-metric-card min-h-24 p-3">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5 text-primary" />
                    Комментарии
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-foreground">
                    {formatNumber(totalComments)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <p className="tk-pill">
                <CalendarDays className="size-3.5 text-primary" />
                На платформе с {formatDate(user.createdAt)}
              </p>
              {!user.deletedAt && !isBanned ? <ProfilePresenceCounter /> : null}
              {!user.deletedAt && !isBanned ? (
                <ReportForm
                  targetType="USER"
                  targetId={user.id}
                  returnPath={`/profile/${user.username}`}
                  disabled={!current?.user.emailVerified || isOwner || isBanned}
                  className="w-full sm:w-auto sm:max-w-sm"
                />
              ) : null}
            </div>
          </div>
        </section>

        {user.deletedAt ? (
          <Card>
            <CardHeader>
              <CardTitle>Профиль скрыт</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Аккаунт деактивирован. Публичная карточка автора больше не показывает личные
                сведения.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pinnedPost ? (
              <section className="space-y-4">
                <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
                  <Pin className="size-5 text-primary" />
                  Закреплено
                </h2>
                <PostCard
                  post={pinnedPost}
                  featured
                  pin={
                    canManagePinnedPost
                      ? {
                          canPin: true,
                          isPinned: true,
                        }
                      : undefined
                  }
                />
              </section>
            ) : null}

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Опубликованные посты</h2>
              {profilePosts.length > 0 ? (
                profilePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    pin={
                      canManagePinnedPost
                        ? {
                            canPin: true,
                            isPinned: false,
                          }
                        : undefined
                    }
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      У автора пока нет опубликованных материалов.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            {isOwner ? (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Мои черновики</h2>
                {draftPosts.length > 0 ? (
                  draftPosts.map((post) => <PostCard key={post.id} post={post} showStatus />)
                ) : (
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Черновиков пока нет.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </PresenceProvider>
  );
}
