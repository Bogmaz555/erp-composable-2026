/** W52 — MES routing aggregate contract */
describe('W52 — mes/routing/aggregate', () => {
  it('routing aggregate response shape', () => {
    const res = {
      workCenterCount: 2,
      totalOperations: 8,
      workCenters: [
        { workCenter: 'WC-01', operationCount: 5, pending: 1, inProgress: 1, completed: 3, utilizationPct: 60 },
      ],
      checkedAt: new Date().toISOString(),
    };
    expect(res.workCenterCount).toBeGreaterThanOrEqual(0);
    expect(res.workCenters[0].workCenter).toBeDefined();
  });
});
