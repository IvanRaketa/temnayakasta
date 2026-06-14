import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PostEditor } from "@/components/editor/post-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { db } from "@/lib/db";
import { PostStatus } from "@/lib/generated/prisma/client";
import { getPostEditPath, getPostIdFromPublicSlug, getPostPublicSlug } from "@/lib/posts/urls";
import { decodeRouteParam } from "@/lib/routing/decode-route-param";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редактирование поста",
  description: "Редактирование публикации в Тёмной Касте.",
};

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteParam(rawSlug);
  const postId = getPostIdFromPublicSlug(slug);
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    notFound();
  }

  const post = await db.post.findFirst({
    where: {
      ...(postId ? { id: postId } : { slug }),
      authorId: current.user.id,
      status: {
        in: [PostStatus.DRAFT, PostStatus.PUBLISHED],
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
      slug: true,
      status: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  if (slug !== getPostPublicSlug(post)) {
    redirect(getPostEditPath(post));
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Редактирование публикации</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Можно сохранить изменения как черновик или снова опубликовать материал.
          </p>
        </CardContent>
      </Card>
      <PostEditor
        initialPost={{
          ...post,
          tags: post.tags.map((item) => item.tag.name),
        }}
      />
    </div>
  );
}
