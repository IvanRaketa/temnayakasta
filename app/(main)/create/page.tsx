import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LogIn, MessageSquare, PenLine, UserPlus } from "lucide-react";

import { PostEditor } from "@/components/editor/post-editor";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";

export const metadata: Metadata = {
  title: "Создание поста",
  description: "Редактор публикации и черновиков в Тёмной Касте.",
};

export default async function CreatePostPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Card className="tk-glass-strong overflow-hidden">
          <CardHeader className="space-y-4 p-5 sm:p-7">
            <div className="tk-kicker w-fit">
              <PenLine className="size-3.5" />
              Создание поста
            </div>
            <CardTitle className="max-w-2xl text-2xl leading-tight sm:text-3xl">
              Чтобы написать пост, войди или создай аккаунт.
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-6 pt-0 sm:px-7 sm:pb-7">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              После регистрации ты сможешь публиковать посты, сохранять черновики, получать реакции
              и собирать свою аудиторию внутри Тёмной Касты.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 justify-center px-5">
                <Link href="/login">
                  <LogIn className="size-4" />
                  Войти
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-11 justify-center px-5">
                <Link href="/register">
                  <UserPlus className="size-4" />
                  Создать аккаунт
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <h2 className="text-sm font-semibold text-foreground">Публикации</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Пиши посты, добавляй изображения и открывай темы для обсуждения.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <PenLine className="size-4" />
              </span>
              <h2 className="text-sm font-semibold text-foreground">Черновики</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Сохраняй незаконченные материалы и возвращайся к ним позже.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                <MessageSquare className="size-4" />
              </span>
              <h2 className="text-sm font-semibold text-foreground">Реакции</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Получай комментарии, лайки и обратную связь от сообщества.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PresenceProvider scope="create" initialActivity="creating_post">
      <div className="space-y-5">
        <Card className="tk-glass-strong">
          <CardHeader>
            <CardTitle>Изображения в постах</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              Прямая загрузка файлов на сайт отключена. Сначала загрузите фото на внешний сервис,
              затем вставьте в редактор прямую HTTPS-ссылку на изображение.
            </p>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <a href="https://postimages.org/" target="_blank" rel="noreferrer">
                Загрузить фото на Postimages
              </a>
            </Button>
          </CardContent>
        </Card>
        <PostEditor />
      </div>
    </PresenceProvider>
  );
}
