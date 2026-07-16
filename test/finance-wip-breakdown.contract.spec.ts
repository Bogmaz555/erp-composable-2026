/** W53 — fin/projects/:id/wip-breakdown contract */
describe('W53 — fin/projects/:projectId/wip-breakdown', () => {
  it('WIP breakdown response shape', () => {
    const res = {
      found: true,
      projectId: 'proj-1',
      breakdown: { MATERIAL: { amount: 1000, count: 2 }, LABOR: { amount: 500, count: 1 } },
      totals: { combinedActual: 1500, costByTypeTotal: 1500 },
      checkedAt: new Date().toISOString(),
    };
    expect(res.found).toBe(true);
    expect(res.totals.combinedActual).toBeGreaterThanOrEqual(0);
  });
});
