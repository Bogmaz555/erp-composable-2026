-- Baseline migration generated from schema.prisma via:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Do not hand-edit to match a live DB; regenerate from schema if models change.
-- Existing push-created DBs: see migrations/README.md (migrate resolve --applied).

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nip" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "sku" TEXT NOT NULL,
    "itemId" TEXT,
    "amount" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION,
    "freightCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customsDuty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "landedUnitCost" DOUBLE PRECISION,
    "projectId" TEXT,
    "bomComponentId" TEXT,
    "supplierId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SHORTAGE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "taskId" TEXT,
    "receivedQty" INTEGER,
    "receivedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_projectId_status_idx" ON "PurchaseOrder"("tenantId", "projectId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

