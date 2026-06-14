ALTER TABLE "Report" ADD COLUMN "details" TEXT;
ALTER TABLE "Report" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "Report" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DELETE FROM "Report" AS r
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "reporterId", "targetType", "targetId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "Report"
) AS ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX "Report_reporterId_targetType_targetId_key" ON "Report"("reporterId", "targetType", "targetId");
