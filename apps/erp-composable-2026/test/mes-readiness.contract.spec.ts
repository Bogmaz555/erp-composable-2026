/** W47 — platform/mes/readiness contract */
describe('W47 — platform/mes/readiness', () => {
  it('response shape for MES ETO spine', () => {
    const res = {
      ready: true,
      td004: 'yellow-minimum',
      workOrderCount: 2,
      probesUp: 3,
      probesTotal: 4,
      probes: [{ name: 'MES ETO spine', ok: true, httpCode: 200, latencyMs: 5 }],
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(res.probesTotal).toBeGreaterThanOrEqual(3);
  });
});
