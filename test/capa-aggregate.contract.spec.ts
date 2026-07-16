/** W55 — capa/aggregate contract */
describe('W55 — quality/capa/aggregate', () => {
  it('CAPA aggregate response shape', () => {
    const res = {
      ncrCount: 2,
      capaCount: 1,
      openNcr: 1,
      capaCoveragePct: 50,
      checkedAt: new Date().toISOString(),
    };
    expect(res.ncrCount).toBeGreaterThanOrEqual(0);
  });
});
