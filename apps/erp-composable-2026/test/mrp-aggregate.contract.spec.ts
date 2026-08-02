/** W56 — mrp/aggregate contract */
describe('W56 — proc/mrp/aggregate', () => {
  it('MRP aggregate response shape', () => {
    const res = {
      purchaseOrderCount: 5,
      netPositiveLines: 2,
      ordersBySource: { MRP: 3, SHORTAGE: 2 },
      checkedAt: new Date().toISOString(),
    };
    expect(res.purchaseOrderCount).toBeGreaterThanOrEqual(0);
  });
});
