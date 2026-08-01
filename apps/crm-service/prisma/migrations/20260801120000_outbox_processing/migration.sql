-- Outbox schema alignment: PROCESSING + attempts/lastError
-- Additive on DBs that already have OutboxEvent/OutboxStatus (e.g. prior db push).
-- Also bootstraps Outbox enum/table IF missing (empty DB / partial schema).
-- NOT a full service-schema baseline — deploy script runs `db push` before
-- `migrate deploy` when only thin/outbox migrations exist (see migrations/README.md).

-- 1) Ensure enum exists (greenfield). Existing DBs skip via duplicate_object.
DO $$ BEGIN
  CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add PROCESSING after PENDING when enum already existed without it (PG16+).
--    IF NOT EXISTS: no-op when label already present (order not reordered).
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'PENDING';

-- 3) Ensure OutboxEvent table exists (empty DB). Column set matches this service schema.
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
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

-- 4) Defensive column backfill (no-op when columns already present).
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lastError" TEXT;

