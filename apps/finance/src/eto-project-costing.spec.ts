import {
  computeLaborCostPln,
  computeOverheadFromLaborPln,
  DEFAULT_LABOR_RATE_PLN_PER_HOUR,
} from './eto-project-costing';

describe('eto-project-costing', () => {
  it('computes labor at default rate', () => {
    expect(DEFAULT_LABOR_RATE_PLN_PER_HOUR).toBe(85);
    expect(computeLaborCostPln(4)).toBe(340);
  });

  it('computes overhead as percentage of labor', () => {
    expect(computeOverheadFromLaborPln(340)).toBe(51);
  });
});
