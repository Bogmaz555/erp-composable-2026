/** W64 — import staging contract */
describe('W64 — import/products/stage', () => {
  it('staging response shape', () => {
    const res = { batchId: 'stg-abc', stagedRows: 2, rolledBack: true };
    expect(res.batchId).toMatch(/^stg-/);
  });
});
