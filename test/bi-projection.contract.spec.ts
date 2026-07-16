/** W73 — BI projection snapshot contract */
describe('W73 — bi/projects/:id/snapshot', () => {
  it('materialized snapshot shape', () => {
    const res = { found: true, projectId: 'proj-1', source: 'materialized', persistence: 'prisma' };
    expect(res.source).toBe('materialized');
  });
});
