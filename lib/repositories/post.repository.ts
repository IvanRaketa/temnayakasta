import { db } from "@/lib/db";
import { PostStatus, type Prisma } from "@/lib/generated/prisma/client";

export const postRepository = {
  findById(id: string) {
    return db.post.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return db.post.findUnique({ where: { slug } });
  },

  listPublished(take = 20) {
    return db.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  create(data: Prisma.PostCreateInput) {
    return db.post.create({ data });
  },
};
