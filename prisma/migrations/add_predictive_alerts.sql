-- CreateTable
CREATE TABLE "PredictiveAlert" (
    "id" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "level" "AlertLevel" NOT NULL DEFAULT 'warn',
    "predictedDate" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictiveAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictiveAlert_siteId_idx" ON "PredictiveAlert"("siteId");

-- CreateIndex
CREATE INDEX "PredictiveAlert_predictedDate_idx" ON "PredictiveAlert"("predictedDate");

-- CreateIndex
CREATE INDEX "PredictiveAlert_expiresAt_idx" ON "PredictiveAlert"("expiresAt");

-- AddForeignKey
ALTER TABLE "PredictiveAlert" ADD CONSTRAINT "PredictiveAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

