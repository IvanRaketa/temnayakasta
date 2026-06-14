import { db } from "@/lib/db";
import { type AdPlacement, type Prisma } from "@/lib/generated/prisma/client";

export const activeAdvertisementSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  targetUrl: true,
  placement: true,
  advertiserName: true,
  erid: true,
  isActive: true,
  startsAt: true,
  endsAt: true,
  impressions: true,
  clicks: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdvertisementSelect;

export type ActiveAdvertisement = Prisma.AdvertisementGetPayload<{
  select: typeof activeAdvertisementSelect;
}>;

export function activeAdvertisementWhere(now = new Date()): Prisma.AdvertisementWhereInput {
  return {
    isActive: true,
    AND: [
      {
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      },
      {
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
    ],
  };
}

export async function getActiveAd(placement: AdPlacement) {
  return db.advertisement.findFirst({
    where: {
      placement,
      ...activeAdvertisementWhere(),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: activeAdvertisementSelect,
  });
}
