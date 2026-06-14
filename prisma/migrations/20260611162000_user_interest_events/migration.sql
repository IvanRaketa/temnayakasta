-- CreateEnum
CREATE TYPE "UserInterestEventType" AS ENUM (
    'post_view',
    'post_like',
    'post_comment',
    'profile_view',
    'follow',
    'tag_click',
    'dwell_time',
    'quick_skip'
);

-- CreateTable
CREATE TABLE "UserInterestEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserInterestEventType" NOT NULL,
    "postId" TEXT,
    "authorId" TEXT,
    "tagId" TEXT,
    "value" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInterestEvent_userId_createdAt_idx" ON "UserInterestEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserInterestEvent_userId_type_createdAt_idx" ON "UserInterestEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UserInterestEvent_userId_postId_type_createdAt_idx" ON "UserInterestEvent"("userId", "postId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "UserInterestEvent_postId_type_idx" ON "UserInterestEvent"("postId", "type");

-- CreateIndex
CREATE INDEX "UserInterestEvent_authorId_type_idx" ON "UserInterestEvent"("authorId", "type");

-- CreateIndex
CREATE INDEX "UserInterestEvent_tagId_type_idx" ON "UserInterestEvent"("tagId", "type");

-- CreateIndex
CREATE INDEX "UserInterestEvent_createdAt_idx" ON "UserInterestEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "UserInterestEvent" ADD CONSTRAINT "UserInterestEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterestEvent" ADD CONSTRAINT "UserInterestEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterestEvent" ADD CONSTRAINT "UserInterestEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterestEvent" ADD CONSTRAINT "UserInterestEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
