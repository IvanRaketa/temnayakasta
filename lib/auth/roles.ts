import { UserRole, type User } from "@/lib/generated/prisma/client";

type RoleUser = Pick<User, "role">;

export function isAdmin(user?: RoleUser | null) {
  return user?.role === UserRole.ADMIN;
}

export function canModerate(user?: RoleUser | null) {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;
}
