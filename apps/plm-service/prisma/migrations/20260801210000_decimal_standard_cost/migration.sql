-- PR 12: secondary money field Item.standardCost → DECIMAL.
-- Do NOT convert engineering floats (weightKg, BomComponent.quantity/scrapFactor).
-- Baseline created DOUBLE PRECISION; convert standardCost in place.

ALTER TABLE "Item"
  ALTER COLUMN "standardCost" TYPE DECIMAL(65,30) USING "standardCost"::DECIMAL(65,30);
