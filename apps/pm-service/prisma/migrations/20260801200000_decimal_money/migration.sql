-- PR 11 / KD-5: pilot-critical money fields → DECIMAL (blocklist).
-- Do NOT convert engineering floats (ccpmBufferPct, ResourceAssignment.units).
-- Baseline created DOUBLE PRECISION; convert money columns in place.

ALTER TABLE "Project"
  ALTER COLUMN "budget" TYPE DECIMAL(65,30) USING "budget"::DECIMAL(65,30),
  ALTER COLUMN "targetRevenue" TYPE DECIMAL(65,30) USING "targetRevenue"::DECIMAL(65,30),
  ALTER COLUMN "baselineCost" TYPE DECIMAL(65,30) USING "baselineCost"::DECIMAL(65,30),
  ALTER COLUMN "actualLaborCost" TYPE DECIMAL(65,30) USING "actualLaborCost"::DECIMAL(65,30);
