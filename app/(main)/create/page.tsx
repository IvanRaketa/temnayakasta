import type { Metadata } from "next";

import { PostEditor } from "@/components/editor/post-editor";
import { PresenceProvider } from "@/components/presence/presence-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Создание поста",
  description: "Редактор публикации и черновиков в Тёмной Касте.",
};

export default function CreatePostPage() {
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
