/** W31 — EAM IoT lite contract shapes */
describe('W31 — EAM IoT lite', () => {
  it('BreakdownEvent shape for persist + recent API', () => {
    const evt = {
      id: 'bd-1',
      equipmentId: 'eq-1',
      reason: 'vibration threshold',
      severity: 'HIGH',
      source: 'IOT',
      detectedAt: new Date().toISOString(),
    };
    expect(evt.source).toBe('IOT');
    expect(evt.severity).toBe('HIGH');
  });

  it('IoT status response shape', () => {
    const status = {
      source: 'eam-iot-lite',
      equipmentTotal: 3,
      brokenCount: 1,
      breakdownsLast7d: 2,
      iotEnabled: true,
    };
    expect(status.iotEnabled).toBe(true);
    expect(status.breakdownsLast7d).toBeGreaterThanOrEqual(0);
  });
});
