import type { Prisma } from "@/lib/generated/prisma/client";

type NotificationClient = Prisma.TransactionClient;

interface CreateNotificationInput {
  userId: string;
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  targetUrl?: string | null;
  uniqueKey?: string | null;
}

export async function createNotificationOnce(
  db: NotificationClient,
  input: CreateNotificationInput,
) {
  if (input.actorId && input.actorId === input.userId) {
    return null;
  }

  if (input.uniqueKey) {
    return db.notification.upsert({
      where: { uniqueKey: input.uniqueKey },
      update: {},
      create: input,
    });
  }

  return db.notification.create({ data: input });
}
