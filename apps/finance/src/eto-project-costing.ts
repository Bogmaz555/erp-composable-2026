/** ETO project costing helpers (Faza 1B — material via reservation.released, labor via production.recorded) */

export const DEFAULT_LABOR_RATE_PLN_PER_HOUR =
  Number(process.env.DEFAULT_LABOR_RATE_PLN_PER_HOUR) || 85;

export const DEFAULT_OVERHEAD_RATE_PCT =
  Number(process.env.DEFAULT_OVERHEAD_RATE_PCT) || 0.15;

export function computeLaborCostPln(
  laborHours: number,
  ratePerHour: number = DEFAULT_LABOR_RATE_PLN_PER_HOUR,
): number {
  return Math.round(laborHours * ratePerHour * 100) / 100;
}

export function computeOverheadFromLaborPln(
  laborAmount: number,
  overheadPct: number = DEFAULT_OVERHEAD_RATE_PCT,
): number {
  return Math.round(laborAmount * overheadPct * 100) / 100;
}

export const DEFAULT_MATERIAL_UNIT_COST_PLN =
  Number(process.env.DEFAULT_MATERIAL_UNIT_COST_PLN) || 50;

export function computeMaterialCommitmentPln(
  quantity: number,
  unitCost: number = DEFAULT_MATERIAL_UNIT_COST_PLN,
): number {
  return Math.round(quantity * unitCost * 100) / 100;
}
