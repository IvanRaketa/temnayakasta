-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "premiumNameEffect" TEXT NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "ConsentAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "ConsentAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAcceptance_userId_type_version_key" ON "ConsentAcceptance"("userId", "type", "version");

-- CreateIndex
CREATE INDEX "ConsentAcceptance_userId_idx" ON "ConsentAcceptance"("userId");

-- CreateIndex
CREATE INDEX "ConsentAcceptance_type_version_idx" ON "ConsentAcceptance"("type", "version");

-- CreateIndex
CREATE INDEX "ConsentAcceptance_acceptedAt_idx" ON "ConsentAcceptance"("acceptedAt");

-- AddForeignKey
ALTER TABLE "ConsentAcceptance" ADD CONSTRAINT "ConsentAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
