-- Outbox schema alignment: PROCESSING status + attempts/lastError
-- Thin migration; safe for empty/dev DBs and additive on existing.

-- AlterEnum: add PROCESSING (PostgreSQL)
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
