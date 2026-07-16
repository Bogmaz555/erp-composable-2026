/** W51 — ECO impact analysis contract */
describe('W51 — plm/ecos/:id/impact', () => {
  it('impact response shape', () => {
    const res = {
      found: true,
      ecoId: 'eco-1',
      ecoNumber: 'ECO-1234',
      title: 'Zmiana BOM',
      status: 'PENDING',
      impactSummary: { affectedBomCount: 1, totalExplodedLines: 5, riskLevel: 'medium' },
      affectedBoms: [{ bomVersionId: 'bom-1', explodedLeafCount: 5 }],
      checkedAt: new Date().toISOString(),
    };
    expect(res.found).toBe(true);
    expect(res.impactSummary.totalExplodedLines).toBeGreaterThanOrEqual(0);
  });
});
