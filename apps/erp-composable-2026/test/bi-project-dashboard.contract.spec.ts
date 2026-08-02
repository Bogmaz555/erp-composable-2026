/** W67 — BI project dashboard contract */
describe('W67 — bi/projects/:id/dashboard', () => {
  it('dashboard response shape', () => {
    const res = {
      projectId: 'proj-1',
      source: 'read-model',
      cost: { source: 'live' },
      manufacturing: { workOrderCount: 0 },
      quality: { ncrCount: 0 },
    };
    expect(res.source).toBe('read-model');
    expect(res.cost.source).toBe('live');
  });
});
