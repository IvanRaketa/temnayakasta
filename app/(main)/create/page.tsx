import type { Metadata } from "next";

import { PostEditor } from "@/components/editor/post-editor";
import { PresenceProvider } from "@/components/presence/presence-provider";

export const metadata: Metadata = {
  title: "Создание поста",
  description: "Редактор публикации и черновиков в Тёмной Касте.",
};

export default function CreatePostPage() {
  return (
    <PresenceProvider scope="create" initialActivity="creating_post">
      <PostEditor />
    </PresenceProvider>
  );
}
