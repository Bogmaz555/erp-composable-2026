-- Baseline migration generated from schema.prisma via:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Do not hand-edit to match a live DB; regenerate from schema if models change.
-- Existing push-created DBs: see migrations/README.md (migrate resolve --applied).

-- CreateEnum
CREATE TYPE "ItemLifecycle" AS ENUM ('DRAFT', 'ACTIVE', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "MakeBuy" AS ENUM ('MAKE', 'BUY', 'PHANTOM');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PART', 'ASSEMBLY', 'MACHINE', 'TOOL', 'CONSUMABLE', 'SERVICE');

-- CreateEnum
CREATE TYPE "BomStatus" AS ENUM ('DRAFT', 'RELEASED', 'SUPERSEDED', 'OBSOLETE');

-- CreateEnum
CREATE TYPE "EcoStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ItemType" NOT NULL DEFAULT 'PART',
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'szt',
    "category" TEXT,
    "material" TEXT,
    "weightKg" DOUBLE PRECISION,
    "attributes" JSONB,
    "lifecycleStatus" "ItemLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "makeBuy" "MakeBuy" NOT NULL DEFAULT 'BUY',
    "revision" TEXT,
    "barcode" TEXT,
    "leadTimeDays" INTEGER,
    "standardCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomVersion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "status" "BomStatus" NOT NULL DEFAULT 'DRAFT',
    "effectivityFrom" TIMESTAMP(3),
    "effectivityTo" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomComponent" (
    "id" TEXT NOT NULL,
    "bomVersionId" TEXT NOT NULL,
    "parentItemId" TEXT NOT NULL,
    "childItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "position" INTEGER,
    "scrapFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "subBomVersionId" TEXT,
    "effectivityFrom" TIMESTAMP(3),
    "effectivityTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringChangeOrder" (
    "id" TEXT NOT NULL,
    "ecoNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EcoStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "impactSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "affectedBoms" JSONB,

    CONSTRAINT "EngineeringChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "Item_partNumber_key" ON "Item"("partNumber");

-- CreateIndex
CREATE INDEX "Item_type_lifecycleStatus_isActive_idx" ON "Item"("type", "lifecycleStatus", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringChangeOrder_ecoNumber_key" ON "EngineeringChangeOrder"("ecoNumber");

-- AddForeignKey
ALTER TABLE "BomVersion" ADD CONSTRAINT "BomVersion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_bomVersionId_fkey" FOREIGN KEY ("bomVersionId") REFERENCES "BomVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_childItemId_fkey" FOREIGN KEY ("childItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_subBomVersionId_fkey" FOREIGN KEY ("subBomVersionId") REFERENCES "BomVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

