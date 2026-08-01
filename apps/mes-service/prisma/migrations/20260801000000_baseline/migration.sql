-- Baseline migration generated from schema.prisma via:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Do not hand-edit to match a live DB; regenerate from schema if models change.
-- Existing push-created DBs: see migrations/README.md (migrate resolve --applied).

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "orderNumber" TEXT NOT NULL,
    "itemId" TEXT,
    "bomVersionId" TEXT,
    "projectId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "workOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "workCenter" TEXT,
    "standardTimeMinutes" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredCertifications" TEXT[],

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "workOrderId" TEXT NOT NULL,
    "bomComponentId" TEXT,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "workOrderId" TEXT NOT NULL,
    "bomComponentId" TEXT,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorId" TEXT,

    CONSTRAINT "MaterialConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "workOrderId" TEXT NOT NULL,
    "quantityGood" INTEGER NOT NULL DEFAULT 0,
    "quantityScrap" INTEGER NOT NULL DEFAULT 0,
    "operatorId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsBuiltRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "workOrderId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsBuiltRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsBuiltComponent" (
    "id" TEXT NOT NULL,
    "asBuiltRecordId" TEXT NOT NULL,
    "bomComponentId" TEXT,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "serialNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "AsBuiltComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "operationId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "OperatorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_orderNumber_key" ON "WorkOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "Operation_tenantId_workOrderId_status_idx" ON "Operation"("tenantId", "workOrderId", "status");

-- CreateIndex
CREATE INDEX "MaterialRequirement_tenantId_workOrderId_idx" ON "MaterialRequirement"("tenantId", "workOrderId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_bomComponentId_idx" ON "MaterialRequirement"("bomComponentId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_itemId_status_idx" ON "MaterialRequirement"("itemId", "status");

-- CreateIndex
CREATE INDEX "MaterialConsumption_tenantId_workOrderId_bomComponentId_idx" ON "MaterialConsumption"("tenantId", "workOrderId", "bomComponentId");

-- CreateIndex
CREATE INDEX "ProductionRecord_tenantId_workOrderId_idx" ON "ProductionRecord"("tenantId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "AsBuiltRecord_serialNumber_key" ON "AsBuiltRecord"("serialNumber");

-- CreateIndex
CREATE INDEX "OperatorSession_tenantId_operationId_idx" ON "OperatorSession"("tenantId", "operationId");

-- CreateIndex
CREATE INDEX "OperatorSession_operatorId_idx" ON "OperatorSession"("operatorId");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_status_idx" ON "OutboxEvent"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsBuiltRecord" ADD CONSTRAINT "AsBuiltRecord_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsBuiltComponent" ADD CONSTRAINT "AsBuiltComponent_asBuiltRecordId_fkey" FOREIGN KEY ("asBuiltRecordId") REFERENCES "AsBuiltRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorSession" ADD CONSTRAINT "OperatorSession_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

