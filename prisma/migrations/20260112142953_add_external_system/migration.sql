-- CreateEnum
CREATE TYPE "ExternalSystemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');
CREATE TYPE "ExternalSystemType" AS ENUM ('POWER_GRID', 'SCADA', 'EMS', 'DMS', 'AMI', 'OTHER');

-- CreateTable
CREATE TABLE "ExternalSystem" (
    "id" UUID NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExternalSystemType" NOT NULL,
    "siteId" UUID NOT NULL,
    "status" "ExternalSystemStatus" NOT NULL DEFAULT 'PENDING',
    "mqttUsername" TEXT,
    "lastSeen" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSystem_systemId_key" ON "ExternalSystem"("systemId");
CREATE INDEX "ExternalSystem_systemId_idx" ON "ExternalSystem"("systemId");
CREATE INDEX "ExternalSystem_siteId_idx" ON "ExternalSystem"("siteId");
CREATE INDEX "ExternalSystem_status_idx" ON "ExternalSystem"("status");
CREATE INDEX "ExternalSystem_type_idx" ON "ExternalSystem"("type");

-- AddForeignKey
ALTER TABLE "ExternalSystem" ADD CONSTRAINT "ExternalSystem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

