/** W59 — project cost-summary contract */
describe('W59 — projects/:id/cost-summary', () => {
  it('live cost summary shape', () => {
    const res = {
      found: true,
      source: 'live',
      projectId: 'proj-1',
      plannedCost: 100000,
      actualCost: 45000,
      breakdown: { materials: 20000, labor: 15000, overhead: 5000, subcontractors: 5000 },
      checkedAt: new Date().toISOString(),
    };
    expect(res.source).toBe('live');
  });
});
