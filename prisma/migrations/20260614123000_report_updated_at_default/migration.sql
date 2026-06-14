-- Keep Report.updatedAt aligned with Prisma's @updatedAt behavior.
ALTER TABLE "Report" ALTER COLUMN "updatedAt" DROP DEFAULT;
