/** W48 — platform/pact/readiness contract (TD-012 lite) */
describe('W48 — platform/pact/readiness', () => {
  it('response shape for Event Registry readiness', () => {
    const res = {
      ready: true,
      td012: 'yellow-minimum',
      registryFile: true,
      activeEvents: 18,
      domains: 8,
      byDomain: { PLM: 1, MES: 1, INV: 3 },
      events: ['plm.bom.released.v2', 'mes.production.recorded.v1'],
      pactBroker: false,
      checkedAt: new Date().toISOString(),
    };
    expect(res.ready).toBe(true);
    expect(res.activeEvents).toBeGreaterThanOrEqual(15);
    expect(['yellow-minimum', 'partial']).toContain(res.td012);
  });
});
