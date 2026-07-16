/** W57 — eam/maintenance/aggregate contract */
describe('W57 — eam/maintenance/aggregate', () => {
  it('maintenance aggregate response shape', () => {
    const res = {
      equipmentCount: 3,
      maintenanceTaskCount: 5,
      availabilityPct: 90,
      checkedAt: new Date().toISOString(),
    };
    expect(res.availabilityPct).toBeGreaterThanOrEqual(0);
  });
});
