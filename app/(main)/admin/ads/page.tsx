import { readdir } from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ImagePlus, Megaphone, Power, ShieldOff } from "lucide-react";

import {
  createAdvertisement,
  deleteAdvertisement,
  toggleAdvertisement,
  updateAdvertisement,
  uploadAdvertisementImage,
} from "@/app/(main)/admin/ads/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { AdPlacement, type Advertisement } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Реклама",
  description: "Управление внутренними рекламными баннерами.",
};

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const placementLabels: Record<AdPlacement, string> = {
  HOME_TOP: "Главная: верх ленты",
  FEED_INLINE: "Ленты: inline",
  POST_BOTTOM: "Пост: после текста",
  SIDEBAR: "Сайдбар",
  MOBILE_INLINE: "Мобильная лента",
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "не задано";

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateTimeInput(date: Date | null | undefined) {
  if (!date) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function ctr(ad: Advertisement) {
  if (ad.impressions <= 0) return "0%";
  return `${((ad.clicks / ad.impressions) * 100).toFixed(2)}%`;
}

async function getReadyPostImages() {
  const postsDir = path.join(process.cwd(), "public", "uploads", "posts");

  try {
    const entries = await readdir(postsDir, { withFileTypes: true });

    return entries
      .filter(
        (entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => `/uploads/posts/${entry.name}`)
      .slice(0, 24);
  } catch {
    return [];
  }
}

function TextareaField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 w-full resize-y rounded-md border border-input bg-background/70 px-3 py-2 text-sm outline-none backdrop-blur transition focus:border-ring"
      />
    </label>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required = false,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </label>
  );
}

function AdvertisementForm({
  action,
  ad,
  selectedImage,
}: {
  action: (formData: FormData) => Promise<void>;
  ad?: Advertisement;
  selectedImage?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {ad ? <input type="hidden" name="id" value={ad.id} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Field name="title" label="Название" defaultValue={ad?.title} required />
        <Field
          name="targetUrl"
          label="Ссылка перехода"
          defaultValue={ad?.targetUrl}
          placeholder="/post/example или https://example.ru"
          required
        />
        <Field
          name="imageUrl"
          label="Изображение"
          defaultValue={ad?.imageUrl ?? selectedImage}
          placeholder="/uploads/ads/banner.webp"
        />
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Место показа</span>
          <select
            name="placement"
            defaultValue={ad?.placement ?? AdPlacement.HOME_TOP}
            className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm outline-none backdrop-blur transition focus:border-ring"
          >
            {Object.values(AdPlacement).map((placement) => (
              <option key={placement} value={placement}>
                {placementLabels[placement]}
              </option>
            ))}
          </select>
        </label>
        <Field name="advertiserName" label="Рекламодатель" defaultValue={ad?.advertiserName} />
        <Field name="erid" label="erid" defaultValue={ad?.erid} />
        <Field
          name="startsAt"
          label="Начало показа"
          type="datetime-local"
          defaultValue={formatDateTimeInput(ad?.startsAt)}
        />
        <Field
          name="endsAt"
          label="Окончание показа"
          type="datetime-local"
          defaultValue={formatDateTimeInput(ad?.endsAt)}
        />
      </div>
      <TextareaField
        name="description"
        label="Описание"
        defaultValue={ad?.description}
        placeholder="Короткий текст баннера"
      />
      <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={ad?.isActive ?? false}
          className="size-4 accent-primary"
        />
        Баннер активен
      </label>
      <Button type="submit">{ad ? "Сохранить баннер" : "Создать баннер"}</Button>
    </form>
  );
}

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ image?: string; error?: string }>;
}) {
  const current = await getCurrentSessionReadOnly();
  if (!current || !current.user.emailVerified || !isAdmin(current.user)) {
    notFound();
  }

  const params = await searchParams;
  const [ads, readyImages, activeCount, totals] = await Promise.all([
    db.advertisement.findMany({ orderBy: [{ createdAt: "desc" }] }),
    getReadyPostImages(),
    db.advertisement.count({ where: { isActive: true } }),
    db.advertisement.aggregate({
      _count: true,
      _sum: { impressions: true, clicks: true },
    }),
  ]);
  const selectedImage = params.image?.startsWith("/uploads/") ? params.image : undefined;

  return (
    <div className="space-y-6">
      <section className="tk-glass-strong tk-panel flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="tk-kicker">Advertising control</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Реклама</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Внутренние баннеры без сторонних рекламных сетей и внешних скриптов.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin">Назад в админку</Link>
        </Button>
      </section>

      {params.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Megaphone className="size-4 text-primary" />
              Всего баннеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals._count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Power className="size-4 text-primary" />
              Активные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4 text-primary" />
              Показы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals._sum.impressions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4 text-primary" />
              Клики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals._sum.clicks ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Создать баннер</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvertisementForm action={createAdvertisement} selectedImage={selectedImage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="size-5 text-primary" />
            Изображения
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={uploadAdvertisementImage} className="flex flex-col gap-3 sm:flex-row">
            <Input name="adImage" type="file" accept=".jpg,.jpeg,.png,.webp,.gif" required />
            <Button type="submit" className="sm:w-fit">
              Загрузить баннер
            </Button>
          </form>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Готовые изображения</h2>
            {readyImages.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {readyImages.map((image) => (
                  <Link
                    key={image}
                    href={`/admin/ads?image=${encodeURIComponent(image)}`}
                    className="group overflow-hidden rounded-md border border-border bg-background/40 transition hover:border-primary/50"
                  >
                    <div className="aspect-[16/9] overflow-hidden bg-secondary/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="size-full object-cover" loading="lazy" />
                    </div>
                    <span className="block truncate px-3 py-2 text-xs text-muted-foreground group-hover:text-foreground">
                      Использовать: {image}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                В public/uploads/posts нет готовых изображений для выбора.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Баннеры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ads.length > 0 ? (
            ads.map((ad) => (
              <div key={ad.id} className="tk-glass rounded-md p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-semibold text-foreground">
                        {ad.title}
                      </h2>
                      <Badge variant={ad.isActive ? "default" : "outline"}>
                        {ad.isActive ? "Активен" : "Отключён"}
                      </Badge>
                      <Badge variant="secondary">{placementLabels[ad.placement]}</Badge>
                    </div>
                    {ad.imageUrl ? (
                      <div className="max-w-md overflow-hidden rounded-md border border-border bg-secondary/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ad.imageUrl}
                          alt=""
                          className="aspect-[16/9] w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p className="break-all">Переход: {ad.targetUrl}</p>
                      <p>
                        Период: {formatDate(ad.startsAt)} - {formatDate(ad.endsAt)}
                      </p>
                      {ad.advertiserName ? <p>Рекламодатель: {ad.advertiserName}</p> : null}
                      {ad.erid ? <p className="break-all">erid: {ad.erid}</p> : null}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <p className="text-muted-foreground">Показы</p>
                        <p className="mt-1 text-base font-semibold text-foreground">
                          {ad.impressions}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <p className="text-muted-foreground">Клики</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{ad.clicks}</p>
                      </div>
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <p className="text-muted-foreground">CTR</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{ctr(ad)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                      <form action={toggleAdvertisement} className="flex-1">
                        <input type="hidden" name="id" value={ad.id} />
                        <Button type="submit" variant="secondary" className="w-full">
                          <Power className="size-4" />
                          {ad.isActive ? "Выключить" : "Включить"}
                        </Button>
                      </form>
                      <form action={deleteAdvertisement} className="flex-1">
                        <input type="hidden" name="id" value={ad.id} />
                        <Button type="submit" variant="outline" className="w-full">
                          <ShieldOff className="size-4" />
                          Мягко отключить
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>

                <details className="mt-4 border-t border-border pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">
                    Редактировать
                  </summary>
                  <div className="mt-4">
                    <AdvertisementForm action={updateAdvertisement} ad={ad} />
                  </div>
                </details>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Пока нет созданных баннеров.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
