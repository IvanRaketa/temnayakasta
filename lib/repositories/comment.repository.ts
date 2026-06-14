import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const commentRepository = {
  findById(id: string) {
    return db.comment.findUnique({ where: { id } });
  },

  listByPost(postId: string) {
    return db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });
  },

  create(data: Prisma.CommentCreateInput) {
    return db.comment.create({ data });
  },
};
