-- PR 11 / KD-5: pilot-critical money fields → DECIMAL (blocklist).
-- Baseline created DOUBLE PRECISION; convert in place for existing DBs.
-- Greenfield: baseline then this migration; schema.prisma is Decimal.

ALTER TABLE "PurchaseOrder"
  ALTER COLUMN "unitPrice" TYPE DECIMAL(65,30) USING "unitPrice"::DECIMAL(65,30),
  ALTER COLUMN "freightCost" TYPE DECIMAL(65,30) USING "freightCost"::DECIMAL(65,30),
  ALTER COLUMN "customsDuty" TYPE DECIMAL(65,30) USING "customsDuty"::DECIMAL(65,30),
  ALTER COLUMN "landedUnitCost" TYPE DECIMAL(65,30) USING "landedUnitCost"::DECIMAL(65,30);
