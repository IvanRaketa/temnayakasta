-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HOME_TOP', 'FEED_INLINE', 'POST_BOTTOM', 'SIDEBAR', 'MOBILE_INLINE');

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetUrl" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "advertiserName" TEXT,
    "erid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advertisement_placement_isActive_idx" ON "Advertisement"("placement", "isActive");

-- CreateIndex
CREATE INDEX "Advertisement_startsAt_idx" ON "Advertisement"("startsAt");

-- CreateIndex
CREATE INDEX "Advertisement_endsAt_idx" ON "Advertisement"("endsAt");

-- CreateIndex
CREATE INDEX "Advertisement_createdAt_idx" ON "Advertisement"("createdAt");
