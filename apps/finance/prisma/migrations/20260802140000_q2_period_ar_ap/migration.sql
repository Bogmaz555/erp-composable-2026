-- Enterprise Q2: AccountingPeriod + AR/AP skeleton
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AccountingPeriod_tenantId_periodKey_key" ON "AccountingPeriod"("tenantId", "periodKey");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_tenantId_status_idx" ON "AccountingPeriod"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "ArInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "client" TEXT NOT NULL,
    "projectId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "milestone" TEXT,
    "ksefReference" TEXT,
    "journalEntryId" TEXT,
    "receivableId" TEXT,
    "correlationId" TEXT,
    "invoiceRef" TEXT,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArInvoice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArInvoice_tenantId_status_projectId_idx" ON "ArInvoice"("tenantId", "status", "projectId");
CREATE INDEX IF NOT EXISTS "ArInvoice_correlationId_idx" ON "ArInvoice"("correlationId");
CREATE INDEX IF NOT EXISTS "ArInvoice_journalEntryId_idx" ON "ArInvoice"("journalEntryId");

CREATE TABLE IF NOT EXISTS "ApBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "vendor" TEXT NOT NULL,
    "orderRef" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "journalEntryId" TEXT,
    "payableId" TEXT,
    "correlationId" TEXT,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApBill_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ApBill_tenantId_status_idx" ON "ApBill"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ApBill_orderRef_idx" ON "ApBill"("orderRef");
CREATE INDEX IF NOT EXISTS "ApBill_correlationId_idx" ON "ApBill"("correlationId");
CREATE INDEX IF NOT EXISTS "ApBill_journalEntryId_idx" ON "ApBill"("journalEntryId");
