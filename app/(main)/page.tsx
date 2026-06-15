import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  FileText,
  MessageSquare,
  Radio,
  ServerCrash,
  Sparkles,
  Users,
} from "lucide-react";

import { AdSlot } from "@/components/ads/ad-slot";
import { PostCard } from "@/components/posts/post-card";
import { HomePresencePulse } from "@/components/presence/home-presence-pulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, CommentStatus, PostStatus, type Prisma } from "@/lib/generated/prisma/client";
import { presenceStore } from "@/lib/presence/store";
import { getHomeRecommendations } from "@/lib/recommendations/home-recommendations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Главная лента",
  description:
    "Главная лента Тёмной Касты: публикуйте посты, обсуждайте темы, подписывайтесь на авторов и собирайте свою ленту рекомендаций.",
};

const HOME_POST_LIMIT = 10;

const homePostInclude = {
  author: {
    select: {
      username: true,
      avatar: true,
      premiumUntil: true,
      profile: { select: { displayName: true, avatar: true, premiumNameEffect: true } },
    },
  },
  _count: { select: { comments: true, reactions: true, views: true } },
  reactions: { select: { type: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.PostInclude;

type HomeFeedPost = Prisma.PostGetPayload<{ include: typeof homePostInclude }>;
type HomeFeedItem = { post: HomeFeedPost; reason: string };

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

const getCachedHomeCounts = unstable_cache(
  async () =>
    Promise.all([
      db.post.count({ where: { status: PostStatus.PUBLISHED } }),
      db.comment.count({ where: { status: CommentStatus.PUBLISHED } }),
      db.postView.count(),
    ]),
  ["home-public-counts"],
  { revalidate: 30 },
);

async function getHomeStats() {
  const pulse = presenceStore.snapshot("site").pulse;
  const [posts, comments, views] = await getCachedHomeCounts();

  return {
    online: pulse.usersOnline,
    posts,
    comments,
    views,
  };
}

async function getStarterHomeFeed(limit: number): Promise<HomeFeedItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20));
  const where = {
    status: PostStatus.PUBLISHED,
    publishedAt: { not: null },
    author: { deletedAt: null },
  } satisfies Prisma.PostWhereInput;

  const [recentPosts, activePosts] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
      include: homePostInclude,
    }),
    db.post.findMany({
      where,
      orderBy: [
        { reactions: { _count: "desc" } },
        { comments: { _count: "desc" } },
        { views: { _count: "desc" } },
        { publishedAt: "desc" },
      ],
      take: safeLimit,
      include: homePostInclude,
    }),
  ]);

  const items: HomeFeedItem[] = [];
  const usedIds = new Set<string>();
  const pushPost = (post: HomeFeedPost, reason: string) => {
    if (items.length >= safeLimit || usedIds.has(post.id)) return;
    usedIds.add(post.id);
    items.push({ post, reason });
  };

  for (let index = 0; index < safeLimit; index += 1) {
    const recentPost = recentPosts[index];
    const activePost = activePosts[index];

    if (recentPost) pushPost(recentPost, "новое в ленте");
    if (activePost) pushPost(activePost, "популярно сейчас");
  }

  return items;
}

async function readHomeSession() {
  try {
    return await getCurrentSessionReadOnly();
  } catch (error) {
    console.error("Home session lookup failed.", error);
    return null;
  }
}

async function readHomeStats() {
  try {
    return await getHomeStats();
  } catch (error) {
    console.error("Home stats lookup failed.", error);
    return {
      online: 0,
      posts: 0,
      comments: 0,
      views: 0,
    };
  }
}

async function readPersonalRecommendations(userId: string) {
  try {
    return await getHomeRecommendations(userId, HOME_POST_LIMIT);
  } catch (error) {
    console.error("Home recommendations lookup failed.", error);
    return [];
  }
}

async function readStarterFeed() {
  try {
    return await getStarterHomeFeed(HOME_POST_LIMIT);
  } catch (error) {
    console.error("Starter home feed lookup failed.", error);
    return [];
  }
}

export default async function HomePage() {
  const current = await readHomeSession();
  const statsPromise = readHomeStats();
  const recommendations = current ? await readPersonalRecommendations(current.user.id) : [];
  const starterFeed = recommendations.length === 0 ? await readStarterFeed() : [];
  const stats = await statsPromise;
  const feedItems = recommendations.length > 0 ? recommendations : starterFeed;
  const isPersonalFeed = recommendations.length > 0;
  const primaryCta = current
    ? { href: "/create", label: "Создать пост" }
    : { href: "/register", label: "Войти в касту" };
  const secondaryCta = current
    ? { href: `/profile/${current.user.username}/island`, label: "Мой остров" }
    : { href: "/login", label: "У меня есть доступ" };
  const statItems = [
    { label: "Онлайн", value: stats.online, icon: Radio },
    { label: "Посты", value: stats.posts, icon: FileText },
    { label: "Комментарии", value: stats.comments, icon: MessageSquare },
    { label: "Просмотры", value: stats.views, icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <section className="tk-hero tk-fade-in">
        <div className="tk-hero-content grid min-h-[inherit] gap-6 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-10 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex max-w-xl flex-col justify-center">
            <div className="tk-kicker">
              <Sparkles className="size-3.5" />
              Социальная сеть
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              Тёмная Каста
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Публикуй посты, обсуждай темы, подписывайся на авторов и собирай свою ленту
              рекомендаций.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Здесь можно читать свежие публикации, находить своих авторов, развивать личный остров
              и оставаться внутри живого сообщества без лишнего шума.
            </p>
            <div className="mt-7 flex flex-col gap-3 xl:flex-row xl:flex-wrap">
              <Button asChild size="default" className="h-11 justify-center px-5">
                <Link href={primaryCta.href}>
                  {primaryCta.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="default" className="h-11 justify-center px-5">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 content-end gap-3">
            {statItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="tk-metric-card tk-slide-up">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="grid size-9 place-items-center rounded-md border border-border bg-background/45 text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="mt-4 text-3xl font-semibold text-foreground">
                    {formatNumber(item.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HomePresencePulse />

      <AdSlot placement={AdPlacement.HOME_TOP} currentUser={current?.user} />

      {feedItems.length > 0 ? (
        <section className="space-y-4">
          <div className="w-full md:mx-auto md:max-w-[44rem]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="tk-kicker">Лента</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-foreground md:text-[1.75rem]">
                  {isPersonalFeed ? "Рекомендовано для тебя" : "Стартовая лента"}
                </h2>
                {!isPersonalFeed ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Пока алгоритм мало знает о тебе, поэтому здесь смесь свежих и популярных постов.
                  </p>
                ) : null}
              </div>
              <span className="tk-pill w-fit">
                <Users className="size-3.5 text-primary" />
                {isPersonalFeed ? "социальная лента" : "новое + популярное"}
              </span>
            </div>
          </div>
          {feedItems.map((item) => (
            <PostCard key={item.post.id} post={item.post} recommendationReason={item.reason} />
          ))}
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCrash className="size-5 text-primary" />
              Главная лента временно недоступна
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Сейчас не удалось загрузить стартовую ленту. Разделы «Новое» и «Популярное» могут быть
              доступны отдельно, а главная обновится после восстановления данных.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
