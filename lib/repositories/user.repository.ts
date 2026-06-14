import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export const userRepository = {
  findById(id: string) {
    return db.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return db.user.findUnique({ where: { email } });
  },

  findByUsername(username: string) {
    return db.user.findUnique({ where: { username } });
  },

  create(data: Prisma.UserCreateInput) {
    return db.user.create({ data });
  },
};
