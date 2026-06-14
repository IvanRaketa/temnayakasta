-- AlterTable
ALTER TABLE "User" ADD COLUMN "premiumUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "profileColor" TEXT;
ALTER TABLE "Profile" ADD COLUMN "coverImage" TEXT;
ALTER TABLE "Profile" ADD COLUMN "pinnedPostId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "statusText" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "actorId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "targetUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN "uniqueKey" TEXT;

-- CreateTable
CREATE TABLE "PostView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorKey" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_uniqueKey_key" ON "Notification"("uniqueKey");

-- CreateIndex
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_userId_key" ON "PostView"("postId", "userId") WHERE "userId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_visitorKey_key" ON "PostView"("postId", "visitorKey") WHERE "visitorKey" IS NOT NULL;

-- CreateIndex
CREATE INDEX "PostView_postId_idx" ON "PostView"("postId");

-- CreateIndex
CREATE INDEX "PostView_userId_idx" ON "PostView"("userId");

-- CreateIndex
CREATE INDEX "PostView_visitorKey_idx" ON "PostView"("visitorKey");

-- CreateIndex
CREATE INDEX "PostView_createdAt_idx" ON "PostView"("createdAt");

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
