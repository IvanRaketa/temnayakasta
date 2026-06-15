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
import { AdPlacement, CommentStatus, PostStatus } from "@/lib/generated/prisma/client";
import { presenceStore } from "@/lib/presence/store";
import { getHomeRecommendations } from "@/lib/recommendations/home-recommendations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Главная лента",
  description:
    "Главная лента Тёмной Касты: опубликованные авторские материалы, обсуждения и свежие публикации сообщества.",
};

const HOME_POST_LIMIT = 10;

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

export default async function HomePage() {
  const current = await getCurrentSessionReadOnly();
  let recommendations: Awaited<ReturnType<typeof getHomeRecommendations>> = [];
  let stats: Awaited<ReturnType<typeof getHomeStats>> = {
    online: 0,
    posts: 0,
    comments: 0,
    views: 0,
  };
  let databaseError = false;

  try {
    [recommendations, stats] = await Promise.all([
      getHomeRecommendations(current?.user.id, HOME_POST_LIMIT),
      getHomeStats(),
    ]);
  } catch (error) {
    databaseError = true;
    console.error(error);
  }

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
              Социальная сеть для авторов, обсуждений, личных островов и живого присутствия внутри
              сообщества.
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

      {databaseError ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCrash className="size-5 text-primary" />
              База данных недоступна
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Сейчас не удалось загрузить публикации. Обновите страницу позже или вернитесь в ленту
              через несколько минут.
            </p>
          </CardContent>
        </Card>
      ) : recommendations.length > 0 ? (
        <section className="space-y-4">
          <div className="w-full md:mx-auto md:max-w-[44rem]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="tk-kicker">Лента</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-foreground md:text-[1.75rem]">
                  Рекомендовано для тебя
                </h2>
              </div>
              <span className="tk-pill w-fit">
                <Users className="size-3.5 text-primary" />
                социальная лента
              </span>
            </div>
          </div>
          {recommendations.map((recommendation) => (
            <PostCard
              key={recommendation.post.id}
              post={recommendation.post}
              recommendationReason={recommendation.reason}
            />
          ))}
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Твоя лента ещё не настроена</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Читай посты, открывай интересные темы, ставь реакции и подписывайся на авторов — после
              этого рекомендации появятся здесь.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
